import React, { createContext, useContext, useEffect, useState } from 'react';
import { handleIncomingRedirect, getDefaultSession, Session } from '@inrupt/solid-client-authn-browser';
import { getSolidDataset, getThing, getStringNoLocale } from '@inrupt/solid-client';
import { VOCAB } from '../vocab';

interface AuthContextType {
  session: Session | null;
  isLoggedIn: boolean;
  webId: string | null;
  userName: string | null;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  isLoggedIn: false,
  webId: null,
  userName: null,
  logout: () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [webId, setWebId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);

  useEffect(() => {
    // Check if we are handling a redirect from the identity provider
    const restoreSession = async () => {
      await handleIncomingRedirect({ restorePreviousSession: true });
      const activeSession = getDefaultSession();
      
      if (activeSession.info.isLoggedIn && activeSession.info.webId) {
        setSession(activeSession);
        setIsLoggedIn(true);
        setWebId(activeSession.info.webId);
        
        try {
          // Fetch the user's name from their WebID profile
          const dataset = await getSolidDataset(activeSession.info.webId, { fetch: activeSession.fetch });
          const profile = getThing(dataset, activeSession.info.webId);
          if (profile) {
            const name = getStringNoLocale(profile, VOCAB.FOAF.name);
            setUserName(name || '');
          }
        } catch (e) {
          console.error("Could not fetch user profile details:", e);
        }
      }
    };
    
    restoreSession();
  }, []);

  const logout = async () => {
    const activeSession = getDefaultSession();
    if (activeSession.info.isLoggedIn) {
      await activeSession.logout();
    }
    setIsLoggedIn(false);
    setWebId(null);
    setSession(null);
    setUserName(null);
  };

  return (
    <AuthContext.Provider value={{ session, isLoggedIn, webId, userName, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
