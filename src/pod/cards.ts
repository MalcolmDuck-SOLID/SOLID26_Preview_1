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
  getUrlAll,
  getTermAll,
  getPropertyAll
} from "@inrupt/solid-client";
import { VOCAB } from "../vocab";
import type { Card } from "../types";

// Infrastructure predicates we skip — these are server plumbing, not user data
const SKIP_PREFIXES = [
  "http://www.w3.org/1999/02/22-rdf-syntax-ns#",  // rdf:type
  "http://www.w3.org/ns/solid/terms#",              // solid:*
  "http://www.w3.org/ns/pim/space#",                // space:*
  "http://www.w3.org/ns/ldp#",                      // ldp:*
  "http://xmlns.com/foaf/0.1/isPrimaryTopicOf",     // foaf:isPrimaryTopicOf
  "http://xmlns.com/foaf/0.1/maker",                // foaf:maker
];

// Known human-readable overrides for common predicates
const KNOWN_LABELS: Record<string, string> = {
  "http://xmlns.com/foaf/0.1/name": "Name",
  "http://xmlns.com/foaf/0.1/nick": "Nickname",
  "http://xmlns.com/foaf/0.1/age": "Age",
  "http://xmlns.com/foaf/0.1/homepage": "Website",
  "http://www.w3.org/2006/vcard/ns#fn": "Full Name",
  "http://www.w3.org/2006/vcard/ns#nickname": "Nickname",
  "http://www.w3.org/2006/vcard/ns#bday": "Birthday",
  "http://www.w3.org/2006/vcard/ns#role": "Role",
  "http://www.w3.org/2006/vcard/ns#note": "Note",
  "http://www.w3.org/2006/vcard/ns#hasPhoto": "Photo",
  "http://www.w3.org/2006/vcard/ns#hasAddress": "Address",
  "http://www.w3.org/2006/vcard/ns#organization-name": "Organisation",
  "http://www.w3.org/2006/vcard/ns#locality": "City",
  "http://www.w3.org/2006/vcard/ns#postal-code": "Postal Code",
  "http://www.w3.org/2006/vcard/ns#street-address": "Street Address",
};

/** Derive a human-readable label from a predicate URI */
function labelFromUri(uri: string): string {
  if (KNOWN_LABELS[uri]) return KNOWN_LABELS[uri];
  // Fall back to the URI fragment or last path segment, title-cased
  const fragment = uri.split('#').pop()?.split('/').pop() || uri;
  return fragment.replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

/**
 * Dynamically scans ALL predicates on the user's WebID profile Thing.
 * Returns every field that has at least one value, skipping server infrastructure.
 */
export async function getProfileFields(webId: string, fetchFn: typeof fetch) {
  try {
    const dataset = await getSolidDataset(webId, { fetch: fetchFn });
    const profileThing = getThing(dataset, webId);

    if (!profileThing) return [];

    const predicates = getPropertyAll(profileThing);
    const availableFields: { uri: string; label: string; value: string }[] = [];
    const seenLabels = new Set<string>();

    for (const pred of predicates) {
      // Skip infrastructure
      if (SKIP_PREFIXES.some(p => pred.startsWith(p))) continue;

      const terms = getTermAll(profileThing, pred);
      if (terms.length > 0) {
        const label = labelFromUri(pred);
        // Skip duplicate labels (e.g., foaf:nick and vcard:nickname both becoming "Nickname")
        // and also skip 'Type' if it slipped through
        if (!seenLabels.has(label) && label.toLowerCase() !== 'type') {
          seenLabels.add(label);
          availableFields.push({
            uri: pred,
            label,
            value: terms[0].value,
          });
        }
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
             const message = getStringNoLocale(cardThing, VOCAB.CM.message) || undefined;
             const fields = getUrlAll(cardThing, VOCAB.CM.hasField);
             const background = getUrlAll(cardThing, VOCAB.CM.hasBackground)[0];
             const color = getStringNoLocale(cardThing, VOCAB.CM.cardColor) || undefined;
             cards.push({ url, label, fields, background, message, color });
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
export async function saveCard(podRoot: string, cardName: string, label: string, fields: string[], background: string | undefined, message: string | undefined, color: string | undefined, fetchFn: typeof fetch): Promise<string> {
  const cleanName = cardName.toLowerCase().replace(/[^a-z0-9]/g, '');
  const cardUrl = `${podRoot}callme/cards/${cleanName}.ttl`;

  let cardThing = buildThing(createThing({ name: "card" }))
    .addUrl("http://www.w3.org/1999/02/22-rdf-syntax-ns#type", VOCAB.CM.Card)
    .addStringNoLocale(VOCAB.CM.label, label);

  if (message) {
    cardThing = cardThing.addStringNoLocale(VOCAB.CM.message, message);
  }

  if (color) {
    cardThing = cardThing.addStringNoLocale(VOCAB.CM.cardColor, color);
  }

  for (const f of fields) {
    cardThing = cardThing.addUrl(VOCAB.CM.hasField, f);
  }

  if (background) {
    cardThing = cardThing.addUrl(VOCAB.CM.hasBackground, background);
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

