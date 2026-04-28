import {
  getSolidDataset,
  getThing,
  getStringNoLocale,
  buildThing,
  createThing,
  saveSolidDatasetAt,
  setThing,
  createSolidDataset,
  getContainedResourceUrlAll,
  getUrlAll
} from "@inrupt/solid-client";
import { VOCAB } from "../vocab";
import { Card } from "../types";

// Extracted fields we care about querying from the profile
const PROFILE_FIELDS = [
  { uri: VOCAB.FOAF.name, label: "Name" },
  { uri: VOCAB.FOAF.age, label: "Age" },
  { uri: VOCAB.VCARD.note, label: "Bio" },
  { uri: VOCAB.FOAF.homepage, label: "Website" },
];

/**
 * Returns available fields from the user's root WebID profile.
 */
export async function getProfileFields(webId: string, fetchFn: typeof fetch) {
  try {
    const dataset = await getSolidDataset(webId, { fetch: fetchFn });
    const profileThing = getThing(dataset, webId);

    if (!profileThing) return [];

    const availableFields = [];
    for (const field of PROFILE_FIELDS) {
      const val = getStringNoLocale(profileThing, field.uri) || profileThing.urls[field.uri];
      if (val && val.length > 0) {
        availableFields.push({ ...field, value: Array.isArray(val) ? val[0] : val });
      }
    }
    return availableFields;
  } catch (e) {
    console.error("Failed to get profile fields", e);
    return [];
  }
}

/**
 * Fetch all cards stored in /callme/cards/
 */
export async function getCards(podRoot: string, fetchFn: typeof fetch): Promise<Card[]> {
  const cardsContainerUrl = `${podRoot}callme/cards/`;
  try {
    const dataset = await getSolidDataset(cardsContainerUrl, { fetch: fetchFn });
    const resourceUrls = getContainedResourceUrlAll(dataset);
    
    // For ACL reasons we don't automatically list everything if hidden, but we query our own container.
    // .ttl files represent the cards
    const cards: Card[] = [];
    for (const url of resourceUrls) {
      if (url.endsWith('.ttl')) {
        try {
          const cardDs = await getSolidDataset(url, { fetch: fetchFn });
          const cardThing = getThing(cardDs, `${url}#card`);
          if (cardThing) {
             const label = getStringNoLocale(cardThing, VOCAB.CM.label) || "Unnamed Card";
             const fields = getUrlAll(cardThing, VOCAB.CM.hasField);
             cards.push({ url, label, fields });
          }
        } catch(e) {
           console.warn("Could not read card at", url);
        }
      }
    }
    return cards;
  } catch (e) {
    console.error("Failed to list cards", e);
    return [];
  }
}

/**
 * Save a new cm:Card mapping
 */
export async function saveCard(podRoot: string, cardName: string, label: string, fields: string[], fetchFn: typeof fetch): Promise<string> {
  const cleanName = cardName.toLowerCase().replace(/[^a-z0-9]/g, '');
  const cardUrl = `${podRoot}callme/cards/${cleanName}.ttl`;

  let cardThing = buildThing(createThing({ name: "card" }))
    .addUrl("http://www.w3.org/1999/02/22-rdf-syntax-ns#type", VOCAB.CM.Card)
    .addStringNoLocale(VOCAB.CM.label, label);

  for (const f of fields) {
    cardThing = cardThing.addUrl(VOCAB.CM.hasField, f);
  }

  const ds = setThing(createSolidDataset(), cardThing.build());

  await saveSolidDatasetAt(cardUrl, ds, { fetch: fetchFn });
  return cardUrl;
}

/**
 * Delete a card by URL
 */
export async function deleteCard(cardUrl: string, fetchFn: typeof fetch): Promise<void> {
  try {
    await fetchFn(cardUrl, { method: "DELETE" });
  } catch (e) {
    console.error("Failed to delete card", e);
  }
}

