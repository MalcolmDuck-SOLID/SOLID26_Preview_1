import { getSolidDataset, getThing, getStringNoLocale } from "@inrupt/solid-client";
import { normalizeCityName } from "../geo/normalize";
import { VOCAB } from "../vocab";

export interface MatchResult {
  contact: string;
  reason: "current" | "home";
  cityName: string;
}

export async function findMatches(currentCity: string, contacts: string[], fetchFn: typeof fetch): Promise<MatchResult[]> {
  const matches: MatchResult[] = [];
  const normalizedCurrent = normalizeCityName(currentCity);
  
  if (!normalizedCurrent) return matches;

  await Promise.allSettled(contacts.map(async (c) => {
    try {
      // 1. We need the contact's podRoot. We naively guess it from their WebID as per previous heuristic.
      const parsed = new URL(c);
      // Let's assume standard /profile/card#me
      const podRoot = c.includes('/profile/card') ? c.replace('/profile/card#me', '/').replace('/profile/card', '/') : `${parsed.origin}/`;
      
      const locUrl = `${podRoot}callme/location.ttl`;
      const ds = await getSolidDataset(locUrl, { fetch: fetchFn });
      const t = getThing(ds, `${locUrl}#location`);
      
      if (t) {
        const cur = getStringNoLocale(t, VOCAB.CM.currentCity);
        const home = getStringNoLocale(t, VOCAB.CM.homeCity);
        
        if (cur && normalizeCityName(cur) === normalizedCurrent) {
          matches.push({ contact: c, reason: "current", cityName: cur });
        } else if (home && normalizeCityName(home) === normalizedCurrent) {
          matches.push({ contact: c, reason: "home", cityName: home });
        }
      }
    } catch { 
      /* Gracefully handle 404/403 */ 
    }
  }));

  return matches;
}
