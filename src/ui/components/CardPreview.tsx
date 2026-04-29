import React, { useEffect, useState } from 'react';
import { getSolidDataset, getThing, getTermAll } from '@inrupt/solid-client';
import type { Card } from '../../types';
import { useAuth } from '../../auth/AuthContext';

const PHOTO_PREDICATE = "http://www.w3.org/2006/vcard/ns#hasPhoto";

interface CardPreviewProps {
  card: Card;
  ownerWebId: string;
  onDelete?: (url: string) => void;
  onEdit?: (url: string) => void;
  timestamp?: string;
}

/** Derive a human-readable label from a predicate URI */
function fieldLabel(uri: string): string {
  const KNOWN: Record<string, string> = {
    "http://xmlns.com/foaf/0.1/name": "Name",
    "http://xmlns.com/foaf/0.1/nick": "Nickname",
    "http://xmlns.com/foaf/0.1/age": "Age",
    "http://xmlns.com/foaf/0.1/homepage": "Website",
    "http://www.w3.org/2006/vcard/ns#fn": "Full Name",
    "http://www.w3.org/2006/vcard/ns#nickname": "Nickname",
    "http://www.w3.org/2006/vcard/ns#bday": "Birthday",
    "http://www.w3.org/2006/vcard/ns#role": "Role",
    "http://www.w3.org/2006/vcard/ns#note": "Note",
    "http://www.w3.org/2006/vcard/ns#hasPhoto": "Photo",
    "http://www.w3.org/2006/vcard/ns#hasAddress": "Address",
    "http://www.w3.org/2006/vcard/ns#organization-name": "Organisation",
    "http://www.w3.org/2006/vcard/ns#locality": "City",
    "http://www.w3.org/2006/vcard/ns#postal-code": "Postal Code",
    "http://www.w3.org/2006/vcard/ns#street-address": "Street Address",
  };
  if (KNOWN[uri]) return KNOWN[uri];
  const fragment = uri.split('#').pop()?.split('/').pop() || uri;
  return fragment.replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

export const CardPreview: React.FC<CardPreviewProps> = ({ card, ownerWebId, onDelete, onEdit, timestamp }) => {
  const { session } = useAuth();
  const [data, setData] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [bgDataUrl, setBgDataUrl] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // Fetch background image — use embedded base64 or authenticated fetch
  useEffect(() => {
    async function fetchBg() {
      if (card.backgroundData) {
        setBgDataUrl(card.backgroundData);
      } else if (card.background && session) {
        try {
          const res = await session.fetch(card.background);
          const blob = await res.blob();
          setBgDataUrl(URL.createObjectURL(blob));
        } catch(e) {
          console.warn("Failed to fetch authenticated background image", e);
        }
      }
    }
    fetchBg();
  }, [card.background, card.backgroundData, session]);

  // Fetch profile data + photo — use embedded data or fetch from pod
  useEffect(() => {
    async function loadCardData() {
      if (!session) return;

      // If we have pre-resolved profile data (shared card), use it directly
      if (card.profileData) {
        setData(card.profileData);
        if (card.photoData) {
          setAvatarUrl(card.photoData);
        }
        setLoading(false);
        return;
      }

      // Otherwise fetch from the owner's profile (original card)
      try {
        const dataset = await getSolidDataset(ownerWebId, { fetch: session.fetch });
        const profile = getThing(dataset, ownerWebId);
        
        if (profile) {
          const extracted: Record<string, string> = {};
          for (const field of card.fields) {
            const terms = getTermAll(profile, field);
            if (terms.length > 0) {
               extracted[field] = terms[0].value;
            }
          }
          setData(extracted);

          // If hasPhoto is among the fields, resolve and fetch as blob
          if (card.fields.includes(PHOTO_PREDICATE) && extracted[PHOTO_PREDICATE]) {
            try {
              const profileDocUrl = ownerWebId.split('#')[0];
              const photoAbsUrl = new URL(extracted[PHOTO_PREDICATE], profileDocUrl).href;
              const res = await session.fetch(photoAbsUrl);
              const blob = await res.blob();
              setAvatarUrl(URL.createObjectURL(blob));
            } catch (e) {
              console.warn("Failed to fetch profile photo", e);
            }
          }
        }
      } catch (e) {
        console.error("Failed to load card values from", ownerWebId, e);
      } finally {
        setLoading(false);
      }
    }
    
    loadCardData();
  }, [card, ownerWebId, session]);

  // Fields to render as text rows (exclude the photo — it gets its own avatar)
  const textFields = card.fields.filter(f => f !== PHOTO_PREDICATE);

  const formatValue = (val: string) => {
    if (val.startsWith('mailto:')) return val.substring(7);
    if (val.startsWith('tel:')) return val.substring(4);
    return val;
  };

  if (loading) {
    return <div className="animate-pulse bg-white rounded-none h-32 w-full border border-stone-200"></div>;
  }

  return (
    <div 
      className="border border-stone-200 rounded-none p-6 shadow-xl relative overflow-hidden group"
      style={bgDataUrl ? {
        backgroundImage: `url(${bgDataUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      } : { backgroundColor: card.color || 'white' }}
    >
      {bgDataUrl && <div className="absolute inset-0 bg-black/60 z-0"></div>}
      <div className="absolute top-0 right-0 w-32 h-32 bg-stone-500/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none fade-in z-0"></div>
      
      {card.fold === 'tl' && (
        <div className="absolute top-0 left-0 z-20 w-[40px] h-[40px]">
          <svg className="absolute inset-0" viewBox="0 0 40 40">
            <polygon points="0,0 40,0 0,40" fill="#fafaf9" />
          </svg>
          <svg className="absolute inset-0 drop-shadow-md" viewBox="0 0 40 40">
            <polygon points="0,40 40,0 40,40" fill="#ffffff" />
          </svg>
        </div>
      )}
      {card.fold === 'tr' && (
        <div className="absolute top-0 right-0 z-20 w-[40px] h-[40px]">
          <svg className="absolute inset-0" viewBox="0 0 40 40">
            <polygon points="0,0 40,0 40,40" fill="#fafaf9" />
          </svg>
          <svg className="absolute inset-0 drop-shadow-md" viewBox="0 0 40 40">
            <polygon points="0,0 40,0 0,40" fill="#ffffff" />
          </svg>
        </div>
      )}

      <div className="flex justify-between items-start mb-4 relative z-10">
        <div className="flex items-center space-x-3">
          {avatarUrl && (
            <img 
              src={avatarUrl} 
              alt="Profile" 
              className="w-12 h-12 rounded-full object-cover border-2 border-white/80 shadow-md shrink-0"
            />
          )}
          <h3 className={`text-xl font-bold ${bgDataUrl ? 'text-white' : 'text-stone-800'}`}>{card.label}</h3>
        </div>
        <div className="flex items-center space-x-2">
          {timestamp && (
            <div className={`text-[10px] uppercase tracking-widest ${bgDataUrl ? 'text-stone-300/80' : 'text-stone-400'}`}>
              {new Date(timestamp).toLocaleDateString()}
            </div>
          )}
          <div className="bg-stone-500/10 text-stone-400 text-xs px-2 py-1 flex items-center justify-center rounded-none border border-stone-500/20 h-6">
            Card
          </div>
          {onEdit && (
            <button 
              onClick={() => onEdit(card.url)}
              className={`${bgDataUrl ? 'text-stone-300' : 'text-stone-400'} hover:text-stone-700 p-1 flex items-center justify-center h-6 w-6 rounded-none hover:bg-stone-500/10 transition-colors`}
              title="Edit Card"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
            </button>
          )}
          {onDelete && (
            <button 
              onClick={() => onDelete(card.url)}
              className={`${bgDataUrl ? 'text-stone-300' : 'text-stone-400'} hover:text-red-400 p-1 flex items-center justify-center h-6 w-6 rounded-none hover:bg-red-500/10 transition-colors`}
              title="Delete Card"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
            </button>
          )}
        </div>
      </div>
      
      <div className="space-y-3 relative z-10">
        {textFields.filter(f => data[f]).map(f => (
          <div key={f} className="flex flex-col">
            <span className={`text-xs ${bgDataUrl ? 'text-stone-300/80' : 'text-stone-500'} font-medium uppercase tracking-wider mb-0.5`}>
              {fieldLabel(f)}
            </span>
            <span className={`${bgDataUrl ? 'text-white' : 'text-stone-700'}`}>
              {formatValue(data[f])}
            </span>
          </div>
        ))}
        {textFields.filter(f => data[f]).length === 0 && !avatarUrl && (
          <p className={`${bgDataUrl ? 'text-stone-300' : 'text-stone-500'} text-sm`}>No fields configured.</p>
        )}
      </div>

      {card.message && (
        <div className={`mt-5 pt-4 border-t relative z-10 ${bgDataUrl ? 'border-white/20' : 'border-stone-100'}`}>
           <p className={`italic ${bgDataUrl ? 'text-stone-100' : 'text-stone-600'}`}>"{card.message}"</p>
        </div>
      )}
    </div>
  );
};
