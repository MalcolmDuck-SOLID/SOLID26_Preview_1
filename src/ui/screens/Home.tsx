import { useEffect, useState } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { bootstrapPod, getPodRoot } from '../../pod/bootstrap';
import { getCards, deleteCard } from '../../pod/cards';
import type { Card } from '../../types';
import { CardPreview } from '../components/CardPreview';
import { Onboarding } from './Onboarding';
import { ContactsScreen } from './Contacts';
import { MatchSheet } from './MatchSheet';
import { InboxScreen } from './Inbox';
import { useMatchWatcher } from '../../match/useMatchWatcher';
import type { MatchResult } from '../../match/findMatches';
import { getContacts } from '../../pod/contacts';
import { LogOut, Loader2, Feather, Plus, Users, Inbox as InboxIcon, MapPin } from 'lucide-react';

export const Home = () => {
  const { session, webId, logout } = useAuth();
  const [bootstrapping, setBootstrapping] = useState(true);
  const [cards, setCards] = useState<Card[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  const [showBuilder, setShowBuilder] = useState(false);
  const [showContacts, setShowContacts] = useState(false);
  const [showInbox, setShowInbox] = useState(false);
  const [showMatchSheet, setShowMatchSheet] = useState(false);
  const [demoCity, setDemoCity] = useState<string | null>(null);
  const [demoMatches, setDemoMatches] = useState<MatchResult[] | null>(null);

  const { matches, currentCity, status: matchStatus } = useMatchWatcher();

  const activeCity = demoCity || currentCity;
  const activeMatches = demoMatches || matches;

  const triggerDemo = async () => {
    if (!session || !webId) return;
    const root = await getPodRoot(webId, session.fetch);
    if (!root) return;
    
    setDemoCity("Edinburgh, UK");
    
    try {
      const contacts = await getContacts(root, session.fetch);
      if (contacts.length > 0) {
        setDemoMatches(contacts.map(c => ({
          contact: c.webId,
          cityName: "Edinburgh, UK",
          reason: "current"
        })));
      } else {
        setDemoMatches([{
          contact: "https://alice.solidcommunity.net/profile/card#me",
          cityName: "Edinburgh, UK",
          reason: "current"
        }]);
      }
      setShowMatchSheet(true);
    } catch (e) {
      console.error("Demo failed", e);
    }
  };

  const loadCards = async () => {
    if (!session || !webId) return;
    try {
      const root = await getPodRoot(webId, session.fetch);
      if (root) {
        const podCards = await getCards(root, session.fetch);
        setCards(podCards);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteCard = async (url: string) => {
    if (!session) return;
    await deleteCard(url, session.fetch);
    await loadCards(); // Refresh
  };

  useEffect(() => {
    async function initPod() {
      if (session && webId) {
        try {
          await bootstrapPod(webId, session.fetch);
          await loadCards();
        } catch (e: any) {
          setError(e.message || "Failed to bootstrap pod.");
        } finally {
          setBootstrapping(false);
        }
      }
    }
    initPod();
  }, [session, webId]);

  if (bootstrapping) {
    return (
      <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center text-stone-900">
        <Loader2 className="animate-spin mb-4 text-stone-500" size={32} />
        <p className="text-stone-500">Loading your profile data...</p>
      </div>
    );
  }

  if (showContacts) {
    return <ContactsScreen onBack={() => setShowContacts(false)} />;
  }

  if (showInbox) {
    return <InboxScreen onBack={() => setShowInbox(false)} />;
  }

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 p-6">
      <header className="max-w-md mx-auto flex items-center justify-between py-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border border-stone-200">
            <Feather size={20} className="text-stone-500" />
          </div>
          <h1 className="text-2xl font-serif">Bunbary</h1>
        </div>
        <div className="flex items-center space-x-2">
          <button 
            onClick={() => setShowInbox(true)}
            className="w-10 h-10 bg-white hover:bg-stone-100 rounded-xl flex items-center justify-center text-stone-500 hover:text-stone-400 transition-colors"
            title="Inbox"
          >
            <InboxIcon size={18} />
          </button>
          <button 
            onClick={() => setShowContacts(true)}
            className="w-10 h-10 bg-white hover:bg-stone-100 rounded-xl flex items-center justify-center text-stone-500 hover:text-stone-400 transition-colors"
            title="Contacts"
          >
            <Users size={18} />
          </button>
          <button 
            onClick={logout}
            className="w-10 h-10 bg-white hover:bg-stone-100 rounded-xl flex items-center justify-center text-stone-500 hover:text-red-400 transition-colors"
            title="Sign out"
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <main className="max-w-md mx-auto mt-6">
        {activeCity && (matchStatus === "done" || demoCity) && activeMatches.length > 0 && (
          <div 
            onClick={() => setShowMatchSheet(true)}
            className="mb-8 bg-stone-500/10 border border-stone-500/30 rounded-none p-4 flex items-center justify-between cursor-pointer hover:bg-stone-500/20 transition-colors"
          >
            <div className="flex items-center space-x-3">
              <span className="text-2xl">📍</span>
              <div>
                <h4 className="font-semibold text-stone-400">{activeCity} — away from home</h4>
                <p className="text-sm text-stone-600">You have {activeMatches.length} contacts here. Want to say hi?</p>
              </div>
            </div>
          </div>
        )}

        {showMatchSheet && (
          <MatchSheet 
            matches={activeMatches} 
            onClose={() => setShowMatchSheet(false)} 
          />
        )}

        {error && (
           <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-none mb-8 text-sm">
             {error}
           </div>
        )}

        {showBuilder || cards.length === 0 ? (
          <div>
            {cards.length > 0 && (
              <button 
                onClick={() => setShowBuilder(false)}
                className="text-stone-400 text-sm mb-4 font-medium"
              >
                ← Back to cards
              </button>
            )}
            <Onboarding onComplete={() => {
              setShowBuilder(false);
              loadCards();
            }} />
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold">Your Cards</h3>
              <button 
                onClick={() => setShowBuilder(true)}
                className="w-8 h-8 rounded-full bg-stone-500/10 text-stone-400 flex items-center justify-center hover:bg-stone-500/20 transition-colors"
              >
                <Plus size={16} />
              </button>
            </div>
            
            <div className="space-y-6">
              {cards.map(card => (
                 <CardPreview key={card.url} card={card} ownerWebId={webId!} onDelete={handleDeleteCard} />
              ))}
            </div>
            
            <div className="mt-8 pt-6 border-t border-stone-200 text-center">
              <p className="text-stone-400 text-xs break-all uppercase tracking-widest">
                Connected to Pod
              </p>
              <p className="text-stone-500 text-sm break-all mt-1">
                {webId}
              </p>
            </div>
          </div>
        )}
      </main>

      <button 
        onClick={triggerDemo}
        className="fixed bottom-6 left-6 w-12 h-12 bg-stone-800 text-white rounded-full flex items-center justify-center shadow-2xl hover:bg-stone-700 hover:scale-105 transition-all group z-50"
        title="Trigger Edinburgh Demo"
      >
        <MapPin size={20} className="group-hover:animate-bounce" />
      </button>
    </div>
  );
};
