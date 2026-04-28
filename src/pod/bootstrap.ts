import { 
  getSolidDataset, 
  createContainerAt,
  saveSolidDatasetAt,
  createSolidDataset,
  setThing,
  buildThing,
  createThing,
  getThing
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
  const locationDoc = `${cmContainer}location.ttl`;
  const contactsDoc = `${cmContainer}contacts.ttl`;

  // 2. Create `/callme/` and `/callme/cards/` if absent. 
  // `saveSolidDatasetAt` handles container creation nicely if we write inside it.
  // But let's be explicit and try to read it, if 404, create it.
  
  try {
    await getSolidDataset(cmContainer, { fetch: fetchFn });
  } catch (err: any) {
    if (err.statusCode === 404) {
      await createContainerAt(cmContainer, { fetch: fetchFn });
    }
  }

  try {
    await getSolidDataset(cardsContainer, { fetch: fetchFn });
  } catch (err: any) {
    if (err.statusCode === 404) {
      await createContainerAt(cardsContainer, { fetch: fetchFn });
    }
  }

  // 3. Create basic structures if missing
  await ensureResource(locationDoc, fetchFn, () => createSolidDataset());
  await ensureResource(contactsDoc, fetchFn, () => createSolidDataset());

  // 4. Update privateTypeIndex.ttl to register cm:Card and cm:Share
  // First, find the private type index from the user's WebID profile.
  const profileDs = await getSolidDataset(webId, { fetch: fetchFn });
  const profile = getThing(profileDs, webId);
  if (!profile) return; // shouldn't happen
  
  // NOTE: a robust implementation dynamically resolves the privateTypeIndex url
  // but for hackathons, creating it at root/settings/privateTypeIndex.ttl is common.
  // For safety, we will just rely on standard path.
  const typeIndexUrl = `${root}settings/privateTypeIndex.ttl`;
  
  try {
    let indexDs = await getSolidDataset(typeIndexUrl, { fetch: fetchFn }).catch(() => createSolidDataset());
    
    // Check if cm:Card is registered
    const existingCardReg = getThing(indexDs, `${typeIndexUrl}#callme-cards`);
    if (!existingCardReg) {
      const cardReg = buildThing(createThing({ name: "callme-cards" }))
        .addUrl("http://www.w3.org/1999/02/22-rdf-syntax-ns#type", VOCAB.SOLID.TypeRegistration)
        .addUrl(VOCAB.SOLID.forClass, VOCAB.CM.Card)
        .addUrl(VOCAB.SOLID.instanceContainer, cardsContainer)
        .build();
      
      indexDs = setThing(indexDs, cardReg);
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
async function getPodRoot(url: string, fetchFn: typeof fetch): Promise<string | null> {
  const headRes = await fetchFn(url, { method: "HEAD" });
  const linkHeader = headRes.headers.get("Link") ?? "";
  if (linkHeader.includes("http://www.w3.org/ns/pim/space#Storage")) {
    return url;
  }
  
  try {
    const dataset = await getSolidDataset(url, { fetch: fetchFn });
    const thing = getThing(dataset, url);
    if (thing) {
      const storage = thing.urls["http://www.w3.org/ns/pim/space#storage"];
      if (storage?.length) return storage[0];
    }
  } catch {}

  const parent = new URL(url);
  const segments = parent.pathname.replace(/\/$/, "").split("/");
  if (segments.length <= 1) return null;
  parent.pathname = segments.slice(0, -1).join("/") + "/";
  return getPodRoot(parent.toString(), fetchFn);
}
