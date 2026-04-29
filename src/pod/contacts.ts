import { 
  getSolidDataset, 
  getThing, 
  getStringNoLocale, 
  getUrl,
  getUrlAll,
  buildThing, 
  createThing, 
  saveSolidDatasetAt, 
  setThing,
  createSolidDataset
} from "@inrupt/solid-client";
import { VOCAB } from "../vocab";
import type { Contact } from "../types";

const RDF_TYPE = "http://www.w3.org/1999/02/22-rdf-syntax-ns#type";
const DC_CREATED = "http://purl.org/dc/terms/created";

/**
 * Read all contacts from /contacts/index.ttl
 * Each foaf:member points to a person document at /contacts/person-*.ttl
 */
export async function getContacts(podRoot: string, fetchFn: typeof fetch): Promise<Contact[]> {
  const indexUrl = `${podRoot}contacts/index.ttl`;
  try {
    const ds = await getSolidDataset(indexUrl, { fetch: fetchFn });
    const group = getThing(ds, `${indexUrl}#this`);
    if (!group) return [];

    const memberUrls = getUrlAll(group, VOCAB.FOAF.member);
    
    const contacts: Contact[] = [];
    for (const memberUrl of memberUrls) {
      try {
        const personDs = await getSolidDataset(memberUrl.split('#')[0], { fetch: fetchFn });
        const person = getThing(personDs, memberUrl);
        if (!person) continue;

        const webId = getUrl(person, VOCAB.FOAF.homepage) || memberUrl;
        const name = getStringNoLocale(person, VOCAB.FOAF.name) || undefined;
        const nick = getStringNoLocale(person, VOCAB.FOAF.nick) || undefined;
        const mbox = getUrl(person, VOCAB.FOAF.mbox) || undefined;
        const homepage = getUrl(person, VOCAB.FOAF.homepage) || undefined;
        const img = getUrl(person, VOCAB.FOAF.img) || undefined;

        contacts.push({
          url: memberUrl,
          webId,
          name,
          nick,
          mbox,
          homepage,
          img,
        });
      } catch (e) {
        // Person document unreadable — include with minimal info
        contacts.push({ url: memberUrl, webId: memberUrl });
      }
    }
    return contacts;
  } catch (e) {
    console.error("Failed to read contacts index", e);
    return [];
  }
}

/**
 * Add a contact:
 * 1. Fetch their profile to resolve foaf:name etc.
 * 2. Create /contacts/person-{timestamp}.ttl as foaf:Person
 * 3. Add foaf:member link to /contacts/index.ttl
 * 4. Add foaf:knows to our WebID profile
 * 5. Grant location access via WAC
 */
export async function addContact(
  podRoot: string, 
  contactWebId: string, 
  ownerWebId: string,
  fetchFn: typeof fetch
): Promise<void> {
  const contactsContainer = `${podRoot}contacts/`;
  const indexUrl = `${contactsContainer}index.ttl`;
  const personDocUrl = `${contactsContainer}person-${Date.now()}.ttl`;
  const personThingUrl = `${personDocUrl}#this`;

  // 1. Resolve contact profile for name/photo enrichment
  let resolvedName: string | undefined;
  let resolvedImg: string | undefined;
  let resolvedNick: string | undefined;
  try {
    const profileDs = await getSolidDataset(contactWebId, { fetch: fetchFn });
    const profile = getThing(profileDs, contactWebId);
    if (profile) {
      resolvedName = getStringNoLocale(profile, VOCAB.FOAF.name) || undefined;
      resolvedImg = getUrl(profile, VOCAB.FOAF.img) || undefined;
      resolvedNick = getStringNoLocale(profile, VOCAB.FOAF.nick) || undefined;
    }
  } catch (e) {
    console.warn("Could not fetch contact profile for enrichment", e);
  }

  // 2. Create person document
  let personThing = buildThing(createThing({ name: "this" }))
    .addUrl(RDF_TYPE, VOCAB.FOAF.Person)
    .addUrl(VOCAB.FOAF.homepage, contactWebId)
    .addStringNoLocale(DC_CREATED, new Date().toISOString());

  if (resolvedName) {
    personThing = personThing.addStringNoLocale(VOCAB.FOAF.name, resolvedName);
  }
  if (resolvedNick) {
    personThing = personThing.addStringNoLocale(VOCAB.FOAF.nick, resolvedNick);
  }
  if (resolvedImg) {
    personThing = personThing.addUrl(VOCAB.FOAF.img, resolvedImg);
  }

  const personDs = setThing(createSolidDataset(), personThing.build());
  await saveSolidDatasetAt(personDocUrl, personDs, { fetch: fetchFn });

  // 3. Add foaf:member to index
  let indexDs;
  try {
    indexDs = await getSolidDataset(indexUrl, { fetch: fetchFn });
  } catch {
    indexDs = createSolidDataset();
  }

  let groupThing = getThing(indexDs, `${indexUrl}#this`);
  if (!groupThing) {
    groupThing = buildThing(createThing({ name: "this" }))
      .addUrl(RDF_TYPE, VOCAB.FOAF.Group)
      .addStringNoLocale(VOCAB.FOAF.name, "My Contacts")
      .build();
  }

  groupThing = buildThing(groupThing)
    .addUrl(VOCAB.FOAF.member, personThingUrl)
    .build();

  indexDs = setThing(indexDs, groupThing);
  await saveSolidDatasetAt(indexUrl, indexDs, { fetch: fetchFn });

  // 4. Add foaf:knows to our WebID profile
  try {
    const profileDocUrl = ownerWebId.split('#')[0];
    let profileDs = await getSolidDataset(profileDocUrl, { fetch: fetchFn });
    let me = getThing(profileDs, ownerWebId);
    if (me) {
      // Check if foaf:knows already contains this WebID
      const existing = getUrlAll(me, VOCAB.FOAF.knows);
      if (!existing.includes(contactWebId)) {
        me = buildThing(me).addUrl(VOCAB.FOAF.knows, contactWebId).build();
        profileDs = setThing(profileDs, me);
        await saveSolidDatasetAt(profileDocUrl, profileDs, { fetch: fetchFn });
      }
    }
  } catch (e) {
    console.warn("Could not add foaf:knows to WebID profile", e);
  }

  // 5. Grant location access via WAC
  const locationDocUrl = `${podRoot}callme/location.ttl`;
  try {
    const aclUrl = `${locationDocUrl}.acl`;
    const aclBody = `
@prefix acl: <http://www.w3.org/ns/auth/acl#> .

<#owner>
    a acl:Authorization ;
    acl:agent <${ownerWebId}> ;
    acl:accessTo <${locationDocUrl}> ;
    acl:mode acl:Read, acl:Write, acl:Control .

<#contact-${Date.now()}>
    a acl:Authorization ;
    acl:agent <${contactWebId}> ;
    acl:accessTo <${locationDocUrl}> ;
    acl:mode acl:Read .
`;
    await fetchFn(aclUrl, {
      method: "PUT",
      headers: { "Content-Type": "text/turtle" },
      body: aclBody
    });
  } catch (e) {
    console.warn("Failed to grant location access via WAC", e);
  }
}

/**
 * Remove a contact:
 * 1. Remove foaf:member from index
 * 2. Delete the person document
 * 3. Remove foaf:knows from WebID profile
 */
export async function removeContact(
  podRoot: string,
  contactUrl: string,
  contactWebId: string,
  ownerWebId: string,
  fetchFn: typeof fetch
): Promise<void> {
  const indexUrl = `${podRoot}contacts/index.ttl`;

  // 1. Remove from index
  try {
    let indexDs = await getSolidDataset(indexUrl, { fetch: fetchFn });
    let groupThing = getThing(indexDs, `${indexUrl}#this`);
    if (groupThing) {
      groupThing = buildThing(groupThing)
        .removeUrl(VOCAB.FOAF.member, contactUrl)
        .build();
      indexDs = setThing(indexDs, groupThing);
      await saveSolidDatasetAt(indexUrl, indexDs, { fetch: fetchFn });
    }
  } catch (e) {
    console.warn("Could not update index", e);
  }

  // 2. Delete person document
  try {
    const docUrl = contactUrl.split('#')[0];
    await fetchFn(docUrl, { method: "DELETE" });
  } catch (e) {
    console.warn("Could not delete person document", e);
  }

  // 3. Remove foaf:knows from profile
  try {
    const profileDocUrl = ownerWebId.split('#')[0];
    let profileDs = await getSolidDataset(profileDocUrl, { fetch: fetchFn });
    let me = getThing(profileDs, ownerWebId);
    if (me) {
      me = buildThing(me).removeUrl(VOCAB.FOAF.knows, contactWebId).build();
      profileDs = setThing(profileDs, me);
      await saveSolidDatasetAt(profileDocUrl, profileDs, { fetch: fetchFn });
    }
  } catch (e) {
    console.warn("Could not remove foaf:knows from profile", e);
  }
}
