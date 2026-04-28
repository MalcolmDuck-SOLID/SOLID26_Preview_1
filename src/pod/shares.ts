import { 
  getSolidDataset, 
  getThing, 
  getStringNoLocale, 
  getUrl,
  getUrlAll,
  getContainedResourceUrlAll,
  buildThing,
  createThing,
  setThing,
  createSolidDataset,
  saveSolidDatasetAt
} from "@inrupt/solid-client";
import { VOCAB } from "../vocab";
import type { Card } from "../types";

export interface ReceivedShare {
  url: string;
  cardUrl: string;
  senderWebId: string;
  sharedAt: string | null;
}

export async function shareCard(cardUrl: string, targetWebId: string, senderWebId: string, fetchFn: typeof fetch): Promise<void> {
  // 1. Grant Read access via direct WAC .acl file
  try {
    const aclUrl = `${cardUrl}.acl`;
    const aclBody = `
@prefix acl: <http://www.w3.org/ns/auth/acl#> .

<#owner>
    a acl:Authorization ;
    acl:agent <${senderWebId}> ;
    acl:accessTo <${cardUrl}> ;
    acl:mode acl:Read, acl:Write, acl:Control .

<#share-${Date.now()}>
    a acl:Authorization ;
    acl:agent <${targetWebId}> ;
    acl:accessTo <${cardUrl}> ;
    acl:mode acl:Read .
`;

    const res = await fetchFn(aclUrl, {
      method: "PUT",
      headers: { "Content-Type": "text/turtle" },
      body: aclBody
    });

    if (!res.ok) {
      console.warn(`ACL PUT returned ${res.status}. Card may not be readable by recipient.`);
    }
  } catch (e) {
    console.warn("Failed to write ACL. Card may not be readable by recipient.", e);
  }

  // 2. Save a local share record on OUR pod
  const parsed = new URL(senderWebId);
  const podRoot = senderWebId.includes('/profile/card') 
    ? senderWebId.replace('/profile/card#me', '/') 
    : `${parsed.origin}/`;
  
  const shareDocUrl = `${podRoot}callme/shares/share-${Date.now()}.ttl`;
  
  let shareThing = buildThing(createThing({ name: "share" }))
    .addUrl("http://www.w3.org/1999/02/22-rdf-syntax-ns#type", VOCAB.CM.Share)
    .addUrl(VOCAB.CM.sharedCard, cardUrl)
    .addUrl(VOCAB.CM.shareTarget, targetWebId)
    .addStringNoLocale(VOCAB.CM.sharedAt, new Date().toISOString())
    .build();
  
  const ds = setThing(createSolidDataset(), shareThing);
  await saveSolidDatasetAt(shareDocUrl, ds, { fetch: fetchFn });

  // 3. Try LDN notification to their inbox (best-effort for demo)
  try {
    let inboxUrl: string | null = null;
    try {
      const contactDs = await getSolidDataset(targetWebId, { fetch: fetchFn });
      const profile = getThing(contactDs, targetWebId);
      if (profile) {
        inboxUrl = getUrl(profile, "http://www.w3.org/ns/ldp#inbox");
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
   cm:sharedCard <${cardUrl}> ;
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
            shares.push({
              url,
              cardUrl,
              senderWebId: target, // For sent shares, this is who we sent TO
              sharedAt: getStringNoLocale(shareThing, VOCAB.CM.sharedAt)
            });
          }
        }
      } catch { /* skip unreadable */ }
    }
  } catch {
    // Container doesn't exist yet — that's fine
  }
  
  return shares;
}

export async function getInboxShares(myWebId: string, fetchFn: typeof fetch): Promise<ReceivedShare[]> {
  const shares: ReceivedShare[] = [];
  
  // Discover our own inbox
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

          shares.push({
            url,
            cardUrl,
            senderWebId,
            sharedAt: getStringNoLocale(shareThing, VOCAB.CM.sharedAt)
          });
        }
      }
    } catch {
      // Unreadable resource or invalid
    }
  }

  return shares;
}

export async function fetchRemoteCard(cardUrl: string, fetchFn: typeof fetch): Promise<Card | null> {
  try {
    const ds = await getSolidDataset(cardUrl, { fetch: fetchFn });
    const cardThing = getThing(ds, `${cardUrl}#card`);
    if (cardThing) {
      return {
        url: cardUrl,
        label: getStringNoLocale(cardThing, VOCAB.CM.label) || "Shared Card",
        fields: getUrlAll(cardThing, VOCAB.CM.hasField),
        background: getUrlAll(cardThing, VOCAB.CM.hasBackground)[0],
        message: getStringNoLocale(cardThing, VOCAB.CM.message) || undefined
      };
    }
  } catch (e) {
    console.warn("Got card share, but could not read card data (missing auth?)", cardUrl);
  }
  return null;
}

