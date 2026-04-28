# Call Me — Development Log

## Phase 0: Scaffold & Setup
- **Timestamp:** 2026-04-28
- **What was built:** Scaffolded the initial React application using Vite and TypeScript. Installed all required dependencies (`@inrupt/solid-client`, `@inrupt/solid-client-authn-browser`, `tailwindcss`, `lucide-react`, `react-router-dom`).
- **Files changed:** `package.json`, `vite.config.ts`, `src/index.css`, `src/App.tsx`.
- **Key decisions:** Used TailwindCSS v4 with `@tailwindcss/vite` instead of `postcss` as it is the current standard for Vite-based templates. Set up a dark-mode base aesthetic to give the app a premium mobile-first look.
- **Verification:** Dev server verified and running smoothly. Phase 0 is complete.

---

## Phase 1: Auth & Bootstrap
- **Timestamp:** 2026-04-28
- **What was built:** Implemented the `@inrupt/solid-client-authn-browser` integration and robust bootstrapping structure. The app now handles OIDC login to user-specified Identity Providers, persists the session automatically on page load via `handleIncomingRedirect`, and discovers/creates the `/callme/` data container. It also checks for the `privateTypeIndex.ttl` registration of `cm:Card`.
- **Files changed:** `src/vocab.ts`, `src/types.ts`, `src/auth/AuthContext.tsx`, `src/ui/screens/Login.tsx`, `src/pod/bootstrap.ts`, `src/ui/screens/Home.tsx`, and modified `src/App.tsx`.
- **Key decisions:** Extracted Solid authentication state into a top-level React Context (`AuthContext`) to give all screens access to `session`, `webId`, and the user's `foaf:name`. Kept bootstrap logic abstracted into a reusable `bootstrapPod(webId, fetch)` function.
- **Verification:** Login prompts IDP successfully, returns session, discovers profile name, and validates structural creation in the Pod.

---
