import React, { useEffect, useState } from 'react';
import { getSolidDataset, getThing, getStringNoLocale } from '@inrupt/solid-client';
import { Card } from '../../types';
import { useAuth } from '../../auth/AuthContext';
import { VOCAB } from '../../vocab';

interface CardPreviewProps {
  card: Card;
  ownerWebId: string;
  onDelete?: (url: string) => void;
}

const fieldLabels: Record<string, string> = {
  [VOCAB.FOAF.name]: 'Name',
  [VOCAB.FOAF.age]: 'Age',
  [VOCAB.VCARD.note]: 'Bio',
  [VOCAB.FOAF.homepage]: 'Website',
};

export const CardPreview: React.FC<CardPreviewProps> = ({ card, ownerWebId }) => {
  const { session } = useAuth();
  const [data, setData] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCardData() {
      if (!session) return;
      try {
        const dataset = await getSolidDataset(ownerWebId, { fetch: session.fetch });
        const profile = getThing(dataset, ownerWebId);
        
        if (profile) {
          const extracted: Record<string, string> = {};
          for (const field of card.fields) {
            const val = getStringNoLocale(profile, field) || profile.urls[field];
            if (val) {
               extracted[field] = Array.isArray(val) ? val[0] : val;
            }
          }
          setData(extracted);
        }
      } catch (e) {
        console.error("Failed to load card values from", ownerWebId, e);
      } finally {
        setLoading(false);
      }
    }
    
    loadCardData();
  }, [card, ownerWebId, session]);

  if (loading) {
    return <div className="animate-pulse bg-zinc-900 rounded-2xl h-32 w-full border border-zinc-800"></div>;
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl relative overflow-hidden group">
      <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none fade-in"></div>
      
      <div className="flex justify-between items-start mb-4 relative z-10">
        <h3 className="text-xl font-bold text-zinc-100">{card.label}</h3>
        <div className="flex items-center space-x-2">
          <div className="bg-blue-500/10 text-blue-400 text-xs px-2 py-1 flex items-center justify-center rounded border border-blue-500/20 h-6">
            Card
          </div>
          {onDelete && (
            <button 
              onClick={() => onDelete(card.url)}
              className="text-zinc-500 hover:text-red-400 p-1 flex items-center justify-center h-6 w-6 rounded hover:bg-red-500/10 transition-colors"
              title="Delete Card"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
            </button>
          )}
        </div>
      </div>
      
      <div className="space-y-3 relative z-10">
        {card.fields.map(f => (
          <div key={f} className="flex flex-col">
            <span className="text-xs text-zinc-500 font-medium uppercase tracking-wider mb-0.5">
              {fieldLabels[f] || (f.split('#').pop()?.split('/').pop() || f)}
            </span>
            <span className="text-zinc-200">
              {data[f] || <span className="text-zinc-600 italic">Not set</span>}
            </span>
          </div>
        ))}
        {card.fields.length === 0 && (
          <p className="text-zinc-500 text-sm">No fields configured.</p>
        )}
      </div>
    </div>
  );
};
