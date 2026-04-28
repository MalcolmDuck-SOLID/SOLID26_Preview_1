import React, { useEffect, useState } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { getInboxShares, fetchRemoteCard, ReceivedShare } from '../../pod/shares';
import { Card } from '../../types';
import { CardPreview } from '../components/CardPreview';
import { ArrowLeft, Inbox as InboxIcon, Loader2 } from 'lucide-react';

interface InboxScreenProps {
  onBack: () => void;
}

export const InboxScreen: React.FC<InboxScreenProps> = ({ onBack }) => {
  const { session, webId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [shares, setShares] = useState<{ id: string, share: ReceivedShare, card: Card | null }[]>([]);

  useEffect(() => {
    async function load() {
      if (!session || !webId) return;
      try {
        const inboxShares = await getInboxShares(webId, session.fetch);
        
        // Resolve Cards
        const resolved = await Promise.all(inboxShares.map(async s => {
          const card = await fetchRemoteCard(s.cardUrl, session.fetch);
          return { id: s.url, share: s, card };
        }));

        // Sort descending slightly naively
        resolved.sort((a, b) => {
          if (!a.share.sharedAt) return 1;
          if (!b.share.sharedAt) return -1;
          return new Date(b.share.sharedAt).getTime() - new Date(a.share.sharedAt).getTime();
        });

        setShares(resolved);
      } catch (e) {
        console.error("Failed to load inbox", e);
      } finally {
        setLoading(false);
      }
    }
    
    load();
  }, [session, webId]);

  return (
    <div className="bg-zinc-950 min-h-screen text-zinc-50 p-6">
      <div className="max-w-md mx-auto">
        <button 
          onClick={onBack}
          className="flex items-center text-zinc-400 hover:text-zinc-200 mb-6 transition-colors"
        >
          <ArrowLeft size={20} className="mr-2" /> Back
        </button>

        <div className="flex items-center space-x-3 mb-8">
          <div className="w-12 h-12 bg-blue-500/10 text-blue-500 rounded-2xl flex items-center justify-center">
            <InboxIcon size={24} />
          </div>
          <h2 className="text-3xl font-bold tracking-tight">Inbox</h2>
        </div>

        {loading ? (
          <div className="flex justify-center p-8 text-zinc-500"><Loader2 className="animate-spin" size={32} /></div>
        ) : shares.length === 0 ? (
          <div className="text-center p-8 bg-zinc-900 border border-dashed border-zinc-800 rounded-2xl text-zinc-500">
            <p className="mb-2">Your inbox is empty.</p>
            <p className="text-sm">When a contact shares a card, it appears here.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {shares.map(({ id, share, card }) => (
               <div key={id} className="relative">
                 <div className="mb-2 text-sm text-zinc-400 flex items-center justify-between">
                   <span className="truncate flex-1 max-w-[200px]" title={share.senderWebId}>From {share.senderWebId.split('/').slice(-2, -1)[0] || share.senderWebId}</span>
                   {share.sharedAt && <span>{new Date(share.sharedAt).toLocaleDateString()}</span>}
                 </div>
                 
                 {card ? (
                   <CardPreview card={card} ownerWebId={share.senderWebId} />
                 ) : (
                   <div className="p-4 bg-red-500/10 text-red-400 rounded-xl border border-red-500/20 text-sm">
                     Access to this card was revoked or the card is unavailable.
                   </div>
                 )}
               </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
