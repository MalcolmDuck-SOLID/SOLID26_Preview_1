import { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { getPodRoot } from '../pod/bootstrap';
import { updateLocation, getLocation } from '../pod/location';
import { getContacts } from '../pod/contacts';
import { findMatches } from './findMatches';
import type { MatchResult } from './findMatches';
import { getCurrentCoordinates, getCityFromCoords } from '../geo/geolocation';

export function useMatchWatcher() {
  const { session, webId } = useAuth();
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [currentCity, setCurrentCity] = useState<string | null>(null);
  const [homeCity, setHomeCity] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "locating" | "checking" | "done" | "error">("idle");
  const [errorObj, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function runCycle() {
      if (!session || !webId) return;
      
      try {
        setStatus("locating");
        const root = await getPodRoot(webId, session.fetch);
        if (!root) throw new Error("Could not find pod root");

        // 1. Get location from pod
        let podLoc = await getLocation(root, session.fetch);
        setHomeCity(podLoc.homeCity || null);

        // 2. Get physical location
        const coords = await getCurrentCoordinates().catch(() => null);
        let physicalCity: string | null = null;
        if (coords) {
          physicalCity = await getCityFromCoords(coords.lat, coords.lon);
        }

        // 3. Reconcile
        if (physicalCity) {
          setCurrentCity(physicalCity);
          if (physicalCity !== podLoc.currentCity) {
            // Update pod
            await updateLocation(root, physicalCity, podLoc.homeCity || physicalCity, session.fetch);
          }
        } else {
          // Fallback to pod location if no physical
          setCurrentCity(podLoc.currentCity || null);
          physicalCity = podLoc.currentCity || null;
        }

        // 4. Match
        if (physicalCity && podLoc.homeCity && physicalCity !== podLoc.homeCity) {
          setStatus("checking");
          const contacts = await getContacts(root, session.fetch);
          const webIds = contacts.map(c => c.webId);
          const found = await findMatches(physicalCity, webIds, session.fetch);
          setMatches(found);
        }
        
        setStatus("done");
      } catch (e: any) {
        console.error(e);
        setError(e);
        setStatus("error");
      }
    }
    
    runCycle();
  }, [session, webId]);

  return { matches, currentCity, homeCity, status, error: errorObj };
}
