import React, { useEffect, useState } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { getInboxShares, getSentShares, fetchRemoteCard, deleteShare } from '../../pod/shares';
import { getPodRoot } from '../../pod/bootstrap';
import { getSolidDataset, getThing, getStringNoLocale } from '@inrupt/solid-client';
import type { ReceivedShare } from '../../pod/shares';
import type { Card } from '../../types';
import { CardPreview } from '../components/CardPreview';
import { ArrowLeft, Inbox as InboxIcon, Loader2, ExternalLink, Copy, Check, Send, Trash2 } from 'lucide-react';

interface InboxScreenProps {
  onBack: () => void;
}

export const InboxScreen: React.FC<InboxScreenProps> = ({ onBack }) => {
  const { session, webId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'received' | 'sent'>('received');
  const [received, setReceived] = useState<{ id: string, share: ReceivedShare, card: Card | null }[]>([]);
  const [sent, setSent] = useState<{ id: string, share: ReceivedShare, card: Card | null }[]>([]);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [enrichedNames, setEnrichedNames] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!session) return;
    const allWebIds = new Set<string>();
    received.forEach(r => allWebIds.add(r.share.senderWebId));
    sent.forEach(s => allWebIds.add(s.share.senderWebId));

    allWebIds.forEach(async (id) => {
      try {
        const ds = await getSolidDataset(id, { fetch: session.fetch });
        const profile = getThing(ds, id);
        if (profile) {
          const name = getStringNoLocale(profile, "http://www.w3.org/2006/vcard/ns#fn") || 
                       getStringNoLocale(profile, "http://xmlns.com/foaf/0.1/name");
          if (name) {
            setEnrichedNames(prev => ({ ...prev, [id]: name }));
          }
        }
      } catch (e) {
        // Ignore enrichment errors
      }
    });
  }, [received, sent, session]);

  useEffect(() => {
    async function load() {
      if (!session || !webId) return;
      try {
        // Load received (from LDN inbox)
        const inboxShares = await getInboxShares(webId, session.fetch);
        const resolvedReceived = await Promise.all(inboxShares.map(async s => {
          const card = await fetchRemoteCard(s.cardUrl, session.fetch);
          return { id: s.url, share: s, card };
        }));
        resolvedReceived.sort((a, b) => {
          if (!a.share.sharedAt) return 1;
          if (!b.share.sharedAt) return -1;
          return new Date(b.share.sharedAt).getTime() - new Date(a.share.sharedAt).getTime();
        });
        setReceived(resolvedReceived);

        // Load sent (from local /callme/shares/)
        const root = await getPodRoot(webId, session.fetch);
        if (root) {
          const sentShares = await getSentShares(root, session.fetch);
          const resolvedSent = await Promise.all(sentShares.map(async s => {
            const card = await fetchRemoteCard(s.cardUrl, session.fetch);
            return { id: s.url, share: s, card };
          }));
          resolvedSent.sort((a, b) => {
            if (!a.share.sharedAt) return 1;
            if (!b.share.sharedAt) return -1;
            return new Date(b.share.sharedAt).getTime() - new Date(a.share.sharedAt).getTime();
          });
          setSent(resolvedSent);
        }
      } catch (e) {
        console.error("Failed to load inbox", e);
      } finally {
        setLoading(false);
      }
    }
    
    load();
  }, [session, webId]);

  const getShareUrl = (cardUrl: string, senderWebId: string) => {
    const base = window.location.origin + window.location.pathname;
    return `${base}?card=${encodeURIComponent(cardUrl)}&from=${encodeURIComponent(senderWebId)}`;
  };

  const handleCopy = (cardUrl: string, senderWebId: string) => {
    const url = getShareUrl(cardUrl, senderWebId);
    navigator.clipboard.writeText(url);
    setCopiedUrl(cardUrl);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  const handleDelete = async (shareUrl: string) => {
    if (!session) return;
    try {
      await deleteShare(shareUrl, session.fetch);
      setReceived(prev => prev.filter(s => s.share.url !== shareUrl));
      setSent(prev => prev.filter(s => s.share.url !== shareUrl));
    } catch (e) {
      console.error("Failed to delete share", e);
    }
  };

  const currentShares = tab === 'received' ? received : sent;

  return (
    <div className="bg-stone-50 min-h-screen text-stone-900 p-6">
      <div className="max-w-md mx-auto">
        <button 
          onClick={onBack}
          className="flex items-center text-stone-500 hover:text-stone-700 mb-6 transition-colors"
        >
          <ArrowLeft size={20} className="mr-2" /> Back
        </button>

        <div className="flex items-center space-x-3 mb-6">
          <div className="w-12 h-12 bg-stone-500/10 text-stone-500 rounded-2xl flex items-center justify-center">
            <InboxIcon size={24} />
          </div>
          <h2 className="text-3xl font-bold tracking-tight">Card Tray</h2>
        </div>

        {/* Tabs */}
        <div className="flex space-x-2 mb-8">
          <button
            onClick={() => setTab('received')}
            className={`flex-1 py-2.5 rounded-none text-sm font-medium transition-colors ${
              tab === 'received' ? 'bg-stone-500 text-white' : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'
            }`}
          >
            <InboxIcon size={14} className="inline mr-1.5 -mt-0.5" />
            Received {received.length > 0 && `(${received.length})`}
          </button>
          <button
            onClick={() => setTab('sent')}
            className={`flex-1 py-2.5 rounded-none text-sm font-medium transition-colors ${
              tab === 'sent' ? 'bg-stone-500 text-white' : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'
            }`}
          >
            <Send size={14} className="inline mr-1.5 -mt-0.5" />
            Sent {sent.length > 0 && `(${sent.length})`}
          </button>
        </div>

        <div className="mb-6 text-[10px] text-stone-400 uppercase tracking-widest text-center">
          Fold Key: Left = Long Visit · Right = Short Visit
        </div>

        {loading ? (
          <div className="flex justify-center p-8 text-stone-500"><Loader2 className="animate-spin" size={32} /></div>
        ) : currentShares.length === 0 ? (
          <div className="text-center p-8 bg-white border border-dashed border-stone-200 rounded-none text-stone-500">
            <p className="mb-2">{tab === 'received' ? 'No cards received yet.' : 'No cards shared yet.'}</p>
            <p className="text-sm">{tab === 'received' ? 'When a contact shares a card, it appears here.' : 'Share a card from your Contacts to see it here.'}</p>
          </div>
        ) : (
          <div className="space-y-6">
            {currentShares.map(({ id, share, card }) => (
               <div key={id} className="relative">
                 <div className="mb-2 text-sm text-stone-500 flex items-center justify-between">
                   <span className="truncate flex-1 max-w-[200px]" title={share.senderWebId}>
                     {tab === 'received' ? 'From ' : 'To '}
                     <span className="font-medium text-stone-700">
                       {enrichedNames[share.senderWebId] || share.senderWebId.split('/').slice(-2, -1)[0] || share.senderWebId}
                     </span>
                   </span>
                 </div>
                 
                 {card ? (
                   <>
                     <CardPreview 
                       card={card} 
                       ownerWebId={tab === 'received' ? share.senderWebId : webId!} 
                       timestamp={share.sharedAt || undefined}
                     />
                     <div className="flex space-x-2 mt-3">
                       <a
                         href={getShareUrl(share.cardUrl, tab === 'sent' ? webId! : share.senderWebId)}
                         target="_blank"
                         rel="noopener noreferrer"
                         className="flex-1 flex items-center justify-center space-x-2 py-2.5 bg-white border border-stone-200 rounded-none text-sm font-medium text-stone-700 hover:bg-stone-50 hover:border-stone-300 transition-colors"
                       >
                         <ExternalLink size={14} />
                         <span>View Card</span>
                       </a>
                       <button
                         onClick={() => handleCopy(share.cardUrl, tab === 'sent' ? webId! : share.senderWebId)}
                         className="flex items-center justify-center space-x-2 py-2.5 px-4 bg-white border border-stone-200 rounded-none text-sm font-medium text-stone-700 hover:bg-stone-50 hover:border-stone-300 transition-colors"
                       >
                         {copiedUrl === share.cardUrl ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                         <span>{copiedUrl === share.cardUrl ? 'Copied!' : 'Copy Link'}</span>
                       </button>
                       <button
                         onClick={() => handleDelete(share.url)}
                         className="flex items-center justify-center py-2.5 px-3 bg-white border border-red-200 rounded-none text-sm font-medium text-red-500 hover:bg-red-50 hover:border-red-300 transition-colors"
                         title="Delete"
                       >
                         <Trash2 size={14} />
                       </button>
                     </div>
                   </>
                 ) : (
                   <div className="flex items-center justify-between p-4 bg-red-500/10 text-red-400 rounded-none border border-red-500/20 text-sm">
                     <span>Access to this card was revoked or the card is unavailable.</span>
                     <button
                       onClick={() => handleDelete(share.url)}
                       className="ml-3 p-1.5 rounded-none hover:bg-red-500/20 transition-colors"
                       title="Delete"
                     >
                       <Trash2 size={14} />
                     </button>
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
