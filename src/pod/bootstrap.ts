import { 
  getSolidDataset, 
  createContainerAt,
  saveSolidDatasetAt,
  createSolidDataset,
  setThing,
  buildThing,
  createThing,
  getThing,
  getUrlAll
} from "@inrupt/solid-client";
import { VOCAB } from "../vocab";

/**
 * Ensures the `/callme/` container and its sub-resources exist.
 * Also registers the cm:Card and cm:Share types in privateTypeIndex.ttl.
 */
export async function bootstrapPod(webId: string, fetchFn: typeof fetch) {
  // 1. Discover pod root (naive approach based on webId for MVP, often replaces /profile/card#me with /)
  // According to integration guidelines, robust discovery uses recursion, but a simple heuristic works for MVP.
  // Actually, we can use the robust getPodRoot approach.
  const root = await getPodRoot(webId, fetchFn);
  if (!root) throw new Error("Could not discover pod root.");

  const cmContainer = `${root}callme/`;
  const cardsContainer = `${cmContainer}cards/`;
  const sharesContainer = `${cmContainer}shares/`;
  const locationDoc = `${cmContainer}location.ttl`;
  const contactsContainer = `${root}contacts/`;
  const contactsIndexDoc = `${contactsContainer}index.ttl`;

  // 2. Create containers if absent
  for (const container of [cmContainer, cardsContainer, sharesContainer, contactsContainer]) {
    try {
      await getSolidDataset(container, { fetch: fetchFn });
    } catch (err: any) {
      if (err.statusCode === 404) {
        await createContainerAt(container, { fetch: fetchFn });
      }
    }
  }

  // 3. Create basic structures if missing
  await ensureResource(locationDoc, fetchFn, () => createSolidDataset());
  
  // 4. Create /contacts/index.ttl with foaf:Group if absent
  try {
    await getSolidDataset(contactsIndexDoc, { fetch: fetchFn });
  } catch (err: any) {
    if (err.statusCode === 404) {
      const groupThing = buildThing(createThing({ name: "this" }))
        .addUrl("http://www.w3.org/1999/02/22-rdf-syntax-ns#type", VOCAB.FOAF.Group)
        .addStringNoLocale(VOCAB.FOAF.name, "My Contacts")
        .addStringNoLocale("http://purl.org/dc/terms/created", new Date().toISOString())
        .build();
      const ds = setThing(createSolidDataset(), groupThing);
      await saveSolidDatasetAt(contactsIndexDoc, ds, { fetch: fetchFn });
    }
  }

  // 5. Update privateTypeIndex.ttl to register cm:Card and foaf:Person
  const profileDs = await getSolidDataset(webId, { fetch: fetchFn });
  const profile = getThing(profileDs, webId);
  if (!profile) return;
  
  const typeIndexUrl = `${root}settings/privateTypeIndex.ttl`;
  
  try {
    let indexDs = await getSolidDataset(typeIndexUrl, { fetch: fetchFn }).catch(() => createSolidDataset());
    let changed = false;
    
    // Register cm:Card
    if (!getThing(indexDs, `${typeIndexUrl}#callme-cards`)) {
      const cardReg = buildThing(createThing({ name: "callme-cards" }))
        .addUrl("http://www.w3.org/1999/02/22-rdf-syntax-ns#type", VOCAB.SOLID.TypeRegistration)
        .addUrl(VOCAB.SOLID.forClass, VOCAB.CM.Card)
        .addUrl(VOCAB.SOLID.instanceContainer, cardsContainer)
        .build();
      indexDs = setThing(indexDs, cardReg);
      changed = true;
    }

    // Register foaf:Person → /contacts/
    if (!getThing(indexDs, `${typeIndexUrl}#contacts`)) {
      const contactReg = buildThing(createThing({ name: "contacts" }))
        .addUrl("http://www.w3.org/1999/02/22-rdf-syntax-ns#type", VOCAB.SOLID.TypeRegistration)
        .addUrl(VOCAB.SOLID.forClass, VOCAB.FOAF.Person)
        .addUrl(VOCAB.SOLID.instanceContainer, contactsContainer)
        .build();
      indexDs = setThing(indexDs, contactReg);
      changed = true;
    }

    if (changed) {
      await saveSolidDatasetAt(typeIndexUrl, indexDs, { fetch: fetchFn });
    }
  } catch (e) {
    console.warn("Could not manage privateTypeIndex:", e);
  }
}

async function ensureResource(url: string, fetchFn: typeof fetch, createFn: () => any) {
  try {
    await getSolidDataset(url, { fetch: fetchFn });
  } catch (err: any) {
    if (err.statusCode === 404) {
      await saveSolidDatasetAt(url, createFn(), { fetch: fetchFn });
    }
  }
}

// Robust root discovery
export async function getPodRoot(url: string, fetchFn: typeof fetch): Promise<string | null> {
  const headRes = await fetchFn(url, { method: "HEAD" });
  const linkHeader = headRes.headers.get("Link") ?? "";
  if (linkHeader.includes("http://www.w3.org/ns/pim/space#Storage")) {
    return url;
  }
  
  try {
    const dataset = await getSolidDataset(url, { fetch: fetchFn });
    const thing = getThing(dataset, url);
    if (thing) {
      const storage = getUrlAll(thing, "http://www.w3.org/ns/pim/space#storage");
      if (storage?.length) return storage[0];
    }
  } catch {}

  const parent = new URL(url);
  const segments = parent.pathname.replace(/\/$/, "").split("/");
  if (segments.length <= 1) return null;
  parent.pathname = segments.slice(0, -1).join("/") + "/";
  return getPodRoot(parent.toString(), fetchFn);
}
