import { 
  getSolidDataset, 
  getThing, 
  getStringNoLocale,
  getStringNoLocaleAll,
  getUrl,
  getUrlAll,
  getTermAll,
  getContainedResourceUrlAll,
  buildThing,
  createThing,
  setThing,
  createSolidDataset,
  saveSolidDatasetAt,
  getDatetime
} from "@inrupt/solid-client";
import { VOCAB } from "../vocab";
import type { Card } from "../types";

export interface ReceivedShare {
  url: string;
  cardUrl: string;
  senderWebId: string;
  sharedAt: string | null;
}

export async function shareCard(cardUrl: string, targetWebId: string, senderWebId: string, fetchFn: typeof fetch, fold?: 'tl' | 'tr' | 'none'): Promise<void> {
  console.log("[shareCard] Starting share:", { cardUrl, targetWebId, senderWebId });

  // Helper: fetch an image URL and return as base64 data URI
  async function fetchAsBase64(url: string): Promise<string | null> {
    try {
      console.log("[shareCard] Fetching image:", url);
      const res = await fetchFn(url);
      if (!res.ok) {
        console.warn("[shareCard] Image fetch failed:", res.status, url);
        return null;
      }
      const arrayBuffer = await res.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = '';
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64 = btoa(binary);
      const contentType = res.headers.get('content-type') || 'image/jpeg';
      const dataUri = `data:${contentType};base64,${base64}`;
      console.log("[shareCard] Image converted, size:", dataUri.length);
      return dataUri;
    } catch (e) {
      console.warn("[shareCard] Image fetch error:", e);
      return null;
    }
  }

  // Helper: grant agent-specific read ACL
  async function grantReadAccess(resourceUrl: string, ownerWebId: string, agentWebId: string) {
    try {
      const aclUrl = `${resourceUrl}.acl`;
      const aclBody = `
@prefix acl: <http://www.w3.org/ns/auth/acl#> .

<#owner>
    a acl:Authorization ;
    acl:agent <${ownerWebId}> ;
    acl:accessTo <${resourceUrl}> ;
    acl:mode acl:Read, acl:Write, acl:Control .

<#share>
    a acl:Authorization ;
    acl:agent <${agentWebId}> ;
    acl:accessTo <${resourceUrl}> ;
    acl:mode acl:Read .
`;
      await fetchFn(aclUrl, {
        method: "PUT",
        headers: { "Content-Type": "text/turtle" },
        body: aclBody
      });
    } catch (e) {
      console.warn(`Failed to write ACL for ${resourceUrl}`, e);
    }
  }

  // 1. Read the original card
  console.log("[shareCard] Reading card:", cardUrl);
  const cardDs = await getSolidDataset(cardUrl, { fetch: fetchFn });
  const cardThing = getThing(cardDs, `${cardUrl}#card`);
  if (!cardThing) {
    console.error("[shareCard] Card thing not found at", `${cardUrl}#card`);
    throw new Error("Card not found");
  }

  const label = getStringNoLocale(cardThing, VOCAB.CM.label) || "Shared Card";
  const fields = getUrlAll(cardThing, VOCAB.CM.hasField);
  const bgUrl = getUrl(cardThing, VOCAB.CM.hasBackground) || getStringNoLocale(cardThing, VOCAB.CM.hasBackground);
  const message = getStringNoLocale(cardThing, VOCAB.CM.message);
  const cardColor = getStringNoLocale(cardThing, VOCAB.CM.cardColor);
  console.log("[shareCard] Card data:", { label, fields: fields.length, bgUrl: !!bgUrl, message: !!message, cardColor });

  // 2. Fetch background image as base64
  let backgroundData: string | null = null;
  if (bgUrl) {
    const absBgUrl = new URL(bgUrl, cardUrl).href;
    backgroundData = await fetchAsBase64(absBgUrl);
  }

  // 3. Resolve profile fields and photo
  const profileDocUrl = senderWebId.split('#')[0];
  console.log("[shareCard] Reading profile:", profileDocUrl);
  const profileDs = await getSolidDataset(profileDocUrl, { fetch: fetchFn });
  const profile = getThing(profileDs, senderWebId);

  const profileData: Record<string, string> = {};
  let photoData: string | null = null;

  if (profile) {
    for (const field of fields) {
      const terms = getTermAll(profile, field);
      if (terms.length > 0) {
        if (field === "http://www.w3.org/2006/vcard/ns#hasPhoto") {
          const absPhotoUrl = new URL(terms[0].value, profileDocUrl).href;
          photoData = await fetchAsBase64(absPhotoUrl);
        } else {
          profileData[field] = terms[0].value;
        }
      }
    }
  }
  console.log("[shareCard] Profile data:", { fields: Object.keys(profileData).length, hasPhoto: !!photoData, hasBg: !!backgroundData });

  // 4. Create the self-contained shared card copy
  const parsed = new URL(senderWebId);
  const podRoot = senderWebId.includes('/profile/card')
    ? senderWebId.replace('/profile/card#me', '/')
    : `${parsed.origin}/`;
  
  const sharedCardUrl = `${podRoot}callme/shares/card-${Date.now()}.ttl`;

  let sharedCard = buildThing(createThing({ name: "card" }))
    .addUrl("http://www.w3.org/1999/02/22-rdf-syntax-ns#type", VOCAB.CM.Card)
    .addStringNoLocale(VOCAB.CM.label, label);

  for (const field of fields) {
    sharedCard = sharedCard.addUrl(VOCAB.CM.hasField, field);
  }

  for (const [predicate, value] of Object.entries(profileData)) {
    sharedCard = sharedCard.addStringNoLocale(VOCAB.CM.profileData, `${predicate}|||${value}`);
  }

  if (message) {
    sharedCard = sharedCard.addStringNoLocale(VOCAB.CM.message, message);
  }
  if (backgroundData) {
    sharedCard = sharedCard.addStringNoLocale(VOCAB.CM.backgroundData, backgroundData);
  }
  if (photoData) {
    sharedCard = sharedCard.addStringNoLocale(VOCAB.CM.photoData, photoData);
  }
  if (cardColor) {
    sharedCard = sharedCard.addStringNoLocale(VOCAB.CM.cardColor, cardColor);
  }
  if (fold && fold !== 'none') {
    sharedCard = sharedCard.addStringNoLocale(VOCAB.CM.cardFold, fold);
  }

  let ds = setThing(createSolidDataset(), sharedCard.build());

  const shareMeta = buildThing(createThing({ name: "share" }))
    .addUrl("http://www.w3.org/1999/02/22-rdf-syntax-ns#type", VOCAB.CM.Share)
    .addUrl(VOCAB.CM.sharedCard, sharedCardUrl)
    .addUrl(VOCAB.CM.shareTarget, targetWebId)
    .addStringNoLocale(VOCAB.CM.sharedAt, new Date().toISOString())
    .build();

  ds = setThing(ds, shareMeta);

  console.log("[shareCard] Saving shared card copy:", sharedCardUrl);
  await saveSolidDatasetAt(sharedCardUrl, ds, { fetch: fetchFn });

  // 5. Grant the recipient read access to the shared copy
  await grantReadAccess(sharedCardUrl, senderWebId, targetWebId);

  // 6. Try LDN notification (best-effort)
  try {
    let inboxUrl: string | null = null;
    try {
      const contactDs = await getSolidDataset(targetWebId, { fetch: fetchFn });
      const contactProfile = getThing(contactDs, targetWebId);
      if (contactProfile) {
        inboxUrl = getUrl(contactProfile, "http://www.w3.org/ns/ldp#inbox");
      }
    } catch { /* ignore */ }

    if (!inboxUrl) {
      const p = new URL(targetWebId);
      const root = targetWebId.includes('/profile/card') ? targetWebId.replace('/profile/card#me', '/') : `${p.origin}/`;
      inboxUrl = `${root}inbox/`;
    }

    const ldnBody = `
@prefix cm: <${VOCAB.CM.Card.replace('Card', '')}> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

<> a cm:Share ;
   cm:sharedCard <${sharedCardUrl}> ;
   cm:shareTarget <${targetWebId}> ;
   cm:sharedAt "${new Date().toISOString()}"^^xsd:dateTime .
`;

    await fetchFn(inboxUrl, {
      method: "POST",
      headers: { "Content-Type": "text/turtle", "Slug": `share-${Date.now()}` },
      body: ldnBody
    });
  } catch (e) {
    console.warn("LDN notification failed (best-effort)", e);
  }
}

/**
 * Get shares that WE sent (from /callme/shares/)
 */
export async function getSentShares(podRoot: string, fetchFn: typeof fetch): Promise<ReceivedShare[]> {
  const shares: ReceivedShare[] = [];
  const sharesContainerUrl = `${podRoot}callme/shares/`;
  
  try {
    const ds = await getSolidDataset(sharesContainerUrl, { fetch: fetchFn });
    const urls = getContainedResourceUrlAll(ds);
    
    for (const url of urls) {
      try {
        const shareDs = await getSolidDataset(url, { fetch: fetchFn });
        const shareThing = getThing(shareDs, `${url}#share`);
        if (shareThing) {
          const cardUrl = getUrl(shareThing, VOCAB.CM.sharedCard);
          const target = getUrl(shareThing, VOCAB.CM.shareTarget);
          if (cardUrl && target) {
            const dt = getDatetime(shareThing, VOCAB.CM.sharedAt);
            shares.push({
              url,
              cardUrl,
              senderWebId: target,
              sharedAt: dt ? dt.toISOString() : (getStringNoLocale(shareThing, VOCAB.CM.sharedAt) || null)
            });
          }
        }
      } catch { /* skip unreadable */ }
    }
  } catch {
    // Container doesn't exist yet
  }
  
  return shares;
}

export async function getInboxShares(myWebId: string, fetchFn: typeof fetch): Promise<ReceivedShare[]> {
  const shares: ReceivedShare[] = [];
  
  let inboxUrl: string | null = null;
  try {
    const ds = await getSolidDataset(myWebId, { fetch: fetchFn });
    const profile = getThing(ds, myWebId);
    if (profile) {
      inboxUrl = getUrl(profile, "http://www.w3.org/ns/ldp#inbox");
    }
  } catch (e) {
    console.error("Could not read own WebID for inbox", e);
  }

  if (!inboxUrl) return shares;

  let inboxDs;
  try {
    inboxDs = await getSolidDataset(inboxUrl, { fetch: fetchFn });
  } catch (e) {
    return shares;
  }

  const resourceUrls = getContainedResourceUrlAll(inboxDs);

  for (const url of resourceUrls) {
    try {
      const targetDs = await getSolidDataset(url, { fetch: fetchFn });
      const shareThing = getThing(targetDs, url);
      
      if (shareThing) {
        const cardUrl = getUrl(shareThing, VOCAB.CM.sharedCard);
        const target = getUrl(shareThing, VOCAB.CM.shareTarget);
        
        if (cardUrl && target === myWebId) {
          const parsed = new URL(cardUrl);
          const senderWebId = `${parsed.origin}/profile/card#me`;

          const dt = getDatetime(shareThing, VOCAB.CM.sharedAt);
          shares.push({
            url,
            cardUrl,
            senderWebId,
            sharedAt: dt ? dt.toISOString() : (getStringNoLocale(shareThing, VOCAB.CM.sharedAt) || null)
          });
        }
      }
    } catch {
      // Unreadable
    }
  }

  return shares;
}

export async function deleteShare(shareUrl: string, fetchFn: typeof fetch): Promise<void> {
  await fetchFn(shareUrl, { method: "DELETE" });
}

export async function fetchRemoteCard(cardUrl: string, fetchFn: typeof fetch): Promise<Card | null> {
  try {
    const ds = await getSolidDataset(cardUrl, { fetch: fetchFn });
    const cardThing = getThing(ds, `${cardUrl}#card`);
    if (cardThing) {
      // Read embedded base64 data
      const backgroundData = getStringNoLocale(cardThing, VOCAB.CM.backgroundData) || undefined;
      const photoData = getStringNoLocale(cardThing, VOCAB.CM.photoData) || undefined;
      
      // Read pre-resolved profile data
      const profileDataEntries = getStringNoLocaleAll(cardThing, VOCAB.CM.profileData);
      const profileData: Record<string, string> = {};
      for (const entry of profileDataEntries) {
        const [predicate, value] = entry.split('|||');
        if (predicate && value) {
          profileData[predicate] = value;
        }
      }

      return {
        url: cardUrl,
        label: getStringNoLocale(cardThing, VOCAB.CM.label) || "Shared Card",
        fields: getUrlAll(cardThing, VOCAB.CM.hasField),
        background: getUrlAll(cardThing, VOCAB.CM.hasBackground)[0],
        color: getStringNoLocale(cardThing, VOCAB.CM.cardColor) || undefined,
        fold: (getStringNoLocale(cardThing, VOCAB.CM.cardFold) as 'tl' | 'tr' | 'none') || undefined,
        backgroundData,
        message: getStringNoLocale(cardThing, VOCAB.CM.message) || undefined,
        photoData,
        profileData: Object.keys(profileData).length > 0 ? profileData : undefined,
      };
    }
  } catch (e) {
    console.warn("Got card share, but could not read card data (missing auth?)", cardUrl);
  }
  return null;
}
