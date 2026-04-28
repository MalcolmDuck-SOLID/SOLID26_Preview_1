import { 
  getSolidDataset, 
  getThing, 
  getStringNoLocale, 
  getUrl, 
  universalAccess,
  getContainedResourceUrlAll
} from "@inrupt/solid-client";
import { VOCAB } from "../vocab";
import { Card } from "../types";

export interface ReceivedShare {
  url: string;
  cardUrl: string;
  senderWebId: string;
  sharedAt: string | null;
}

export async function shareCard(cardUrl: string, targetWebId: string, fetchFn: typeof fetch): Promise<void> {
  // 1. Grant Read access
  await universalAccess.setAgentAccess(
    cardUrl,
    targetWebId,
    { read: true },
    { fetch: fetchFn }
  );

  // 2. Discover target inbox
  let inboxUrl: string | null = null;
  try {
    const contactDs = await getSolidDataset(targetWebId, { fetch: fetchFn });
    const profile = getThing(contactDs, targetWebId);
    if (profile) {
      inboxUrl = getUrl(profile, "http://www.w3.org/ns/ldp#inbox");
    }
  } catch (e) {
    console.error("Could not read contact WebID to find inbox", e);
  }

  // If no inbox, we fallback to guessing `/inbox/` at their root, but it's dangerous.
  if (!inboxUrl) {
    const parsed = new URL(targetWebId);
    const root = targetWebId.includes('/profile/card') ? targetWebId.replace('/profile/card#me', '/') : `${parsed.origin}/`;
    inboxUrl = `${root}inbox/`;
  }

  // 3. Send Linked Data Notification (LDN)
  const ldnBody = `
@prefix as: <https://www.w3.org/ns/activitystreams#> .
@prefix cm: <${VOCAB.CM.Card.replace('Card', '')}> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

<> a cm:Share ;
   cm:sharedCard <${cardUrl}> ;
   cm:shareTarget <${targetWebId}> ;
   cm:sharedAt "${new Date().toISOString()}"^^xsd:dateTime .
`;

  try {
    await fetchFn(inboxUrl, {
      method: "POST",
      headers: {
        "Content-Type": "text/turtle"
      },
      body: ldnBody
    });
  } catch (e) {
    console.error("Failed to post LDN to inbox", e);
    throw new Error("Granted access, but failed to notify contact.");
  }
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
        // We only care about things that are cm:Share or have cm:sharedCard
        const cardUrl = getUrl(shareThing, VOCAB.CM.sharedCard);
        const target = getUrl(shareThing, VOCAB.CM.shareTarget);
        
        // Anti-spam validation: ensures the notification is meant for me
        if (cardUrl && target === myWebId) {
          // Identify sender from the origin of the card or an ACL?
          // The sender is the owner of the cardUrl. We derive sender webId naive approach.
          const parsed = new URL(cardUrl);
          const senderWebId = `${parsed.origin}/profile/card#me`; // Naive MVP assumption

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
        fields: getUrlAll(cardThing, VOCAB.CM.hasField)
      };
    }
  } catch (e) {
    console.warn("Got card share, but could not read card data (missing auth?)", cardUrl);
  }
  return null;
}
