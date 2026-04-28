import React, { useEffect, useState } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { bootstrapPod, getPodRoot } from '../../pod/bootstrap';
import { getCards, deleteCard } from '../../pod/cards';
import { Card } from '../../types';
import { CardPreview } from '../components/CardPreview';
import { Onboarding } from './Onboarding';
import { ContactsScreen } from './Contacts';
import { LogOut, Loader2, PhoneCall, Plus, Users } from 'lucide-react';

import { useMatchWatcher } from '../../match/useMatchWatcher';

export const Home = () => {
  const { session, userName, webId, logout } = useAuth();
  const [bootstrapping, setBootstrapping] = useState(true);
  const [cards, setCards] = useState<Card[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showBuilder, setShowBuilder] = useState(false);
  const [showContacts, setShowContacts] = useState(false);

  const { matches, currentCity, status: matchStatus } = useMatchWatcher();

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
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-zinc-50">
        <Loader2 className="animate-spin mb-4 text-blue-500" size={32} />
        <p className="text-zinc-400">Loading your profile data...</p>
      </div>
    );
  }

  if (showContacts) {
    return <ContactsScreen onBack={() => setShowContacts(false)} />;
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 p-6">
      <header className="max-w-md mx-auto flex items-center justify-between py-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-zinc-900 rounded-xl flex items-center justify-center border border-zinc-800">
            <PhoneCall size={20} className="text-blue-500" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">Call Me</h1>
        </div>
        <div className="flex items-center space-x-2">
          <button 
            onClick={() => setShowContacts(true)}
            className="w-10 h-10 bg-zinc-900 hover:bg-zinc-800 rounded-xl flex items-center justify-center text-zinc-400 hover:text-blue-400 transition-colors"
            title="Contacts"
          >
            <Users size={18} />
          </button>
          <button 
            onClick={logout}
            className="w-10 h-10 bg-zinc-900 hover:bg-zinc-800 rounded-xl flex items-center justify-center text-zinc-400 hover:text-red-400 transition-colors"
            title="Sign out"
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <main className="max-w-md mx-auto mt-6">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Welcome, {userName || 'Traveler'}</h2>
          <p className="text-zinc-500 text-sm break-all truncate">
            {webId}
          </p>
        </div>

        {currentCity && matchStatus === "done" && matches.length > 0 && (
          <div className="mb-8 bg-blue-500/10 border border-blue-500/30 rounded-2xl p-4 flex items-center justify-between cursor-pointer hover:bg-blue-500/20 transition-colors">
            <div className="flex items-center space-x-3">
              <span className="text-2xl">📍</span>
              <div>
                <h4 className="font-semibold text-blue-400">{currentCity} — away from home</h4>
                <p className="text-sm text-zinc-300">You have {matches.length} contacts here. Want to say hi?</p>
              </div>
            </div>
          </div>
        )}

        {error && (
           <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-2xl mb-8 text-sm">
             {error}
           </div>
        )}

        {showBuilder || cards.length === 0 ? (
          <div>
            {cards.length > 0 && (
              <button 
                onClick={() => setShowBuilder(false)}
                className="text-blue-400 text-sm mb-4 font-medium"
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
                className="w-8 h-8 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center hover:bg-blue-500/20 transition-colors"
              >
                <Plus size={16} />
              </button>
            </div>
            
            <div className="space-y-6">
              {cards.map(card => (
                 <CardPreview key={card.url} card={card} ownerWebId={webId!} onDelete={handleDeleteCard} />
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
