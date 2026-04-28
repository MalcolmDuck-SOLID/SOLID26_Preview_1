import React, { useState, useEffect } from 'react';
import { useAuth } from '../../auth/AuthContext';
import type { MatchResult } from '../../match/findMatches';
import type { Card } from '../../types';
import { getPodRoot } from '../../pod/bootstrap';
import { getCards } from '../../pod/cards';
import { shareCard } from '../../pod/shares';
import { X, Loader2, Send } from 'lucide-react';

interface MatchSheetProps {
  matches: MatchResult[];
  onClose: () => void;
}

export const MatchSheet: React.FC<MatchSheetProps> = ({ matches, onClose }) => {
  const { session, webId } = useAuth();
  const [cards, setCards] = useState<Card[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<MatchResult | null>(null);
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function init() {
      if (!session || !webId) return;
      const root = await getPodRoot(webId, session.fetch);
      if (root) {
         setCards(await getCards(root, session.fetch));
      }
    }
    init();
  }, [session, webId]);

  const handleShare = async () => {
    if (!selectedMatch || !selectedCard || !session) return;
    setSharing(true);
    try {
      await shareCard(selectedCard, selectedMatch.contact, webId!, session.fetch);
      setSuccess(true);
      setTimeout(() => onClose(), 2000);
    } catch (e) {
      console.error(e);
      alert("Failed to share card.");
    } finally {
      setSharing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-stone-50/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white border-t border-stone-200 rounded-t-3xl p-6 shadow-[0_-20px_50px_rgba(0,0,0,0.5)] animate-in slide-in-from-bottom pb-10">
        <button onClick={onClose} className="absolute top-4 right-4 text-stone-9000 hover:text-stone-700">
          <X size={24} />
        </button>
        
        <h3 className="text-2xl font-bold text-stone-900 mb-6">Found in the Wild</h3>
        
        {success ? (
          <div className="bg-green-500/10 border border-green-500/30 text-green-400 p-6 rounded-2xl text-center">
            <h4 className="font-bold mb-2">Card Shared Successfully!</h4>
            <p className="text-sm">They've received a notification in their Inbox.</p>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <label className="block text-sm font-medium text-stone-500 mb-3">1. Select Contact</label>
              <div className="space-y-2">
                {matches.map(m => (
                  <button
                    key={m.contact}
                    onClick={() => setSelectedMatch(m)}
                    className={`w-full flex flex-col text-left p-3 rounded-xl border transition-colors ${
                      selectedMatch?.contact === m.contact ? 'bg-blue-500/10 border-blue-500' : 'bg-stone-100 border-stone-300 hover:border-zinc-500'
                    }`}
                  >
                    <span className="font-medium text-stone-700 truncate">{m.contact}</span>
                    <span className="text-xs text-stone-9000">Also in {m.cityName}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-8">
              <label className="block text-sm font-medium text-stone-500 mb-3">2. Select Card to Share</label>
              <div className="flex space-x-3 overflow-x-auto pb-2 scrollbar-hide">
                {cards.length === 0 ? (
                   <div className="text-stone-9000 text-sm">No cards available. Create one first.</div>
                ) : cards.map(c => (
                  <button
                    key={c.url}
                    onClick={() => setSelectedCard(c.url)}
                    className={`shrink-0 px-4 py-2 rounded-full border transition-colors ${
                      selectedCard === c.url ? 'bg-blue-500 text-white border-blue-400' : 'bg-stone-100 text-stone-600 border-stone-300 hover:border-zinc-500'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            <button 
              onClick={handleShare}
              disabled={!selectedMatch || !selectedCard || sharing}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium py-4 px-4 rounded-xl flex items-center justify-center transition-colors"
            >
              {sharing ? <Loader2 className="animate-spin mr-2" size={20} /> : <Send size={20} className="mr-2" />}
              Share instantly
            </button>
          </>
        )}
      </div>
    </div>
  );
};
