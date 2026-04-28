import { 
  getSolidDataset, 
  getThing, 
  getStringNoLocale, 
  buildThing, 
  createThing, 
  saveSolidDatasetAt, 
  setThing,
  getUrlAll,
  universalAccess
} from "@inrupt/solid-client";
import { VOCAB } from "../vocab";
import type { Contact } from "../types";

export async function getContacts(podRoot: string, fetchFn: typeof fetch): Promise<Contact[]> {
  const contactsDocUrl = `${podRoot}callme/contacts.ttl`;
  try {
    const ds = await getSolidDataset(contactsDocUrl, { fetch: fetchFn });
    const meThing = getThing(ds, `${contactsDocUrl}#me`);
    if (!meThing) return [];

    const webIds = getUrlAll(meThing, VOCAB.FOAF.knows);
    
    // We optionally resolve names. For MVP speed, we'll return what we know, 
    // or we resolve them live. Resolving live can be slow, but we'll do it naively here.
    const contacts: Contact[] = [];
    for (const id of webIds) {
      try {
        const contactDs = await getSolidDataset(id, { fetch: fetchFn });
        const profile = getThing(contactDs, id);
        const name = profile ? getStringNoLocale(profile, VOCAB.FOAF.name) : undefined;
        contacts.push({ webId: id, name: name || undefined });
      } catch (e) {
        // If 403 or unreachable
        contacts.push({ webId: id });
      }
    }
    return contacts;
  } catch (e) {
    console.error("Failed to read contacts", e);
    return [];
  }
}

export async function addContact(podRoot: string, contactWebId: string, fetchFn: typeof fetch): Promise<void> {
  const contactsDocUrl = `${podRoot}callme/contacts.ttl`;
  let ds;
  try {
    ds = await getSolidDataset(contactsDocUrl, { fetch: fetchFn });
  } catch(e) {
    throw new Error("Could not read contacts.ttl");
  }

  // 1. Add to foaf:knows on #me
  let meThing = getThing(ds, `${contactsDocUrl}#me`);
  if (!meThing) {
    meThing = buildThing(createThing({ name: "me" })).build();
  }
  meThing = buildThing(meThing).addUrl(VOCAB.FOAF.knows, contactWebId).build();

  // 2. Add to vcard:Group on #contacts-group
  let groupThing = getThing(ds, `${contactsDocUrl}#contacts-group`);
  if (!groupThing) {
    groupThing = buildThing(createThing({ name: "contacts-group" }))
      .addUrl("http://www.w3.org/1999/02/22-rdf-syntax-ns#type", VOCAB.VCARD.Group)
      .build();
  }
  groupThing = buildThing(groupThing).addUrl(VOCAB.VCARD.hasMember, contactWebId).build();

  ds = setThing(ds, meThing);
  ds = setThing(ds, groupThing);

  await saveSolidDatasetAt(contactsDocUrl, ds, { fetch: fetchFn });

  // 3. Grant access to location.ttl
  const locationDocUrl = `${podRoot}callme/location.ttl`;
  
  try {
    await universalAccess.setAgentAccess(
      locationDocUrl,
      contactWebId,
      { read: true },
      { fetch: fetchFn }
    );
  } catch (e) {
    console.error("Failed to grant group access to location.ttl", e);
    throw new Error("Contact added, but failed to update location privacy settings.");
  }
}
