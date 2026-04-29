import React, { useEffect, useState } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { fetchRemoteCard } from '../../pod/shares';
import type { Card } from '../../types';
import { CardPreview } from '../components/CardPreview';
import { TramFront, Loader2, LogIn, ArrowLeft } from 'lucide-react';

interface SharedCardViewProps {
  cardUrl: string;
  fromWebId: string;
  onBack: () => void;
}

export const SharedCardView: React.FC<SharedCardViewProps> = ({ cardUrl, fromWebId, onBack }) => {
  const { session, isLoggedIn } = useAuth();
  const [card, setCard] = useState<Card | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!session) {
        setLoading(false);
        return;
      }
      try {
        const resolved = await fetchRemoteCard(cardUrl, session.fetch);
        if (resolved) {
          setCard(resolved);
        } else {
          setError("This card is no longer available or you don't have access.");
        }
      } catch (e) {
        setError("Failed to load the shared card.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [cardUrl, session]);

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 p-6">
      <div className="max-w-md mx-auto">
        <button
          onClick={onBack}
          className="flex items-center text-stone-500 hover:text-stone-700 mb-6 transition-colors"
        >
          <ArrowLeft size={20} className="mr-2" /> Back
        </button>

        <div className="flex items-center space-x-3 mb-8">
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border border-stone-200">
            <TramFront size={20} className="text-stone-500" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Call Me</h1>
            <p className="text-xs text-stone-500">Shared Card</p>
          </div>
        </div>

        <div className="mb-4 text-sm text-stone-500">
          From <span className="font-medium text-stone-700">{fromWebId.split('/').slice(-2, -1)[0] || fromWebId}</span>
        </div>

        {!isLoggedIn ? (
          <div className="bg-white border border-stone-200 rounded-2xl p-8 shadow-xl text-center">
            <LogIn size={32} className="mx-auto mb-4 text-stone-500" />
            <h3 className="text-lg font-bold mb-2">Log in to view this card</h3>
            <p className="text-sm text-stone-500 mb-6">
              This card was shared with you on Solid. Log in with your WebID to see it.
            </p>
            <p className="text-xs text-stone-400 break-all">{cardUrl}</p>
          </div>
        ) : loading ? (
          <div className="flex flex-col items-center py-16 text-stone-500">
            <Loader2 className="animate-spin mb-4" size={28} />
            <p>Loading shared card...</p>
          </div>
        ) : error ? (
          <div className="p-6 bg-red-500/10 text-red-500 rounded-2xl border border-red-500/20 text-center">
            <p className="font-medium mb-2">Card Unavailable</p>
            <p className="text-sm">{error}</p>
            <p className="text-xs text-stone-400 mt-4 break-all">{cardUrl}</p>
          </div>
        ) : card ? (
          <CardPreview card={card} ownerWebId={fromWebId} />
        ) : null}
      </div>
    </div>
  );
};
