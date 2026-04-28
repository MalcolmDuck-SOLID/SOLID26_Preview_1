import { 
  getSolidDataset, 
  getThing, 
  getStringNoLocale, 
  buildThing, 
  createThing, 
  saveSolidDatasetAt, 
  setThing 
} from "@inrupt/solid-client";
import { VOCAB } from "../vocab";

// Fallbacks are just for MVP debugging interface
export async function updateLocation(podRoot: string, currentCity: string, homeCity: string, fetchFn: typeof fetch) {
  const url = `${podRoot}callme/location.ttl`;
  
  let ds;
  try {
    ds = await getSolidDataset(url, { fetch: fetchFn });
  } catch (e) {
    // Should have been created by bootstrap
    throw new Error("Could not find location.ttl resource");
  }

  let locThing = getThing(ds, `${url}#location`);
  
  // Need to build new thing because `setThing` with old one can be tricky if we want to overwrite
  if (locThing) {
    locThing = buildThing(locThing)
      .setStringNoLocale(VOCAB.CM.currentCity, currentCity)
      .setStringNoLocale(VOCAB.CM.homeCity, homeCity)
      .build();
  } else {
    locThing = buildThing(createThing({ name: "location" }))
      .addStringNoLocale(VOCAB.CM.currentCity, currentCity)
      .addStringNoLocale(VOCAB.CM.homeCity, homeCity)
      .build();
  }

  ds = setThing(ds, locThing);
  await saveSolidDatasetAt(url, ds, { fetch: fetchFn });
}

export async function getLocation(podRoot: string, fetchFn: typeof fetch): Promise<{ currentCity?: string, homeCity?: string }> {
  try {
    const ds = await getSolidDataset(`${podRoot}callme/location.ttl`, { fetch: fetchFn });
    const locThing = getThing(ds, `${podRoot}callme/location.ttl#location`);
    if (locThing) {
      return {
        currentCity: getStringNoLocale(locThing, VOCAB.CM.currentCity) || undefined,
        homeCity: getStringNoLocale(locThing, VOCAB.CM.homeCity) || undefined
      };
    }
  } catch (e) {
    // Fail silently (expected for 403s on peers)
  }
  return {};
}
