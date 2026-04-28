import { Session } from "@inrupt/solid-client-authn-node";
import { updateLocation } from "../pod/location";

// Requires `@inrupt/solid-client-authn-node` for server-to-pod auth
// Run this file via `npx tsx src/scripts/seed_demo.ts`
async function run() {
  const session = new Session();
  
  // NOTE: Inrupt requires creating a registered Client ID for Client Credentials flow.
  // For standard hackathon demo prep, you would enter credentials here.
  
  const oidcIssuer = process.env.IDP || "https://solidcommunity.net";
  const webId = process.env.WEBID;
  const clientId = process.env.CLIENT_ID;
  const clientSecret = process.env.CLIENT_SECRET;

  if (!clientId || !clientSecret || !webId) {
    console.error("Missing CLIENT_ID or CLIENT_SECRET or WEBID environment variables. Skipping seed execution.");
    return;
  }

  await session.login({
    oidcIssuer,
    clientId,
    clientSecret,
    clientName: "Demo Seeder"
  });

  if (session.info.isLoggedIn) {
    console.log(`Logged in as ${session.info.webId}`);
    const root = webId.replace('/profile/card#me', '/');
    
    // Seed Location as Edinburgh
    console.log("Setting seeded location to Edinburgh...");
    await updateLocation(root, "Edinburgh", "Edinburgh", session.fetch);
    
    console.log("Demo seed successfully completed!");
  } else {
    console.error("Failed to log in.");
  }
}

// run();
