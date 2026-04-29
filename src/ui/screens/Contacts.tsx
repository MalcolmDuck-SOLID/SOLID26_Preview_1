import React, { useEffect, useState } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { getPodRoot } from '../../pod/bootstrap';
import { getContacts, addContact } from '../../pod/contacts';
import { getCards } from '../../pod/cards';
import { shareCard } from '../../pod/shares';
import { getSolidDataset, getThing, getStringNoLocale, getUrl } from '@inrupt/solid-client';
import { VOCAB } from '../../vocab';
import type { Contact, Card } from '../../types';
import { Loader2, UserPlus, Users, Link as LinkIcon, Check, ArrowLeft, Send, X } from 'lucide-react';

interface ContactsProps {
  onBack: () => void;
}

export const ContactsScreen: React.FC<ContactsProps> = ({ onBack }) => {
  const { session, webId } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [newWebId, setNewWebId] = useState('');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Share flow state
  const [shareTarget, setShareTarget] = useState<Contact | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [selectedFold, setSelectedFold] = useState<'none' | 'tl' | 'tr'>('none');
  const [sharing, setSharing] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);

  const loadContacts = async () => {
    if (!session || !webId) return;
    try {
      const root = await getPodRoot(webId, session.fetch);
      if (root) {
        const data = await getContacts(root, session.fetch);
        setContacts(data);
        
        // Background enrichment
        data.forEach(async (c) => {
          try {
            let enrichedName = c.name;
            let enrichedLocation = c.location;
            
            // 1. Profile fallback (vcard:fn, vcard:locality)
            try {
              const profileDs = await getSolidDataset(c.webId, { fetch: session.fetch });
              const profile = getThing(profileDs, c.webId);
              if (profile) {
                if (!enrichedName) {
                  enrichedName = getStringNoLocale(profile, "http://www.w3.org/2006/vcard/ns#fn") || 
                                 getStringNoLocale(profile, "http://xmlns.com/foaf/0.1/name") || 
                                 undefined;
                }
                const addressUrl = getUrl(profile, "http://www.w3.org/2006/vcard/ns#hasAddress");
                if (addressUrl) {
                  const addressThing = getThing(profileDs, addressUrl);
                  if (addressThing) {
                    enrichedLocation = getStringNoLocale(addressThing, "http://www.w3.org/2006/vcard/ns#locality") || enrichedLocation;
                  }
                }
              }
            } catch (e) { /* ignore profile read err */ }
            
            // 2. Live location
            try {
              const parsed = new URL(c.webId);
              const podRoot = c.webId.includes('/profile/card') ? c.webId.replace('/profile/card#me', '/').replace('/profile/card', '/') : `${parsed.origin}/`;
              const locUrl = `${podRoot}callme/location.ttl`;
              const locDs = await getSolidDataset(locUrl, { fetch: session.fetch });
              const locThing = getThing(locDs, `${locUrl}#location`);
              if (locThing) {
                const liveLoc = getStringNoLocale(locThing, VOCAB.CM.currentCity);
                if (liveLoc) enrichedLocation = liveLoc;
              }
            } catch (e) { /* ignore live location err */ }
            
            if (enrichedName !== c.name || enrichedLocation !== c.location) {
              setContacts(prev => prev.map(contact => 
                contact.webId === c.webId ? { ...contact, name: enrichedName || contact.name, location: enrichedLocation } : contact
              ));
            }
          } catch (e) { /* ignore */ }
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadContacts();
  }, [session, webId]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWebId || !session || !webId) return;
    
    setAdding(true);
    setError(null);
    try {
      const root = await getPodRoot(webId, session.fetch);
      if (root) {
        await addContact(root, newWebId, webId, session.fetch);
        setNewWebId('');
        await loadContacts(); // Refresh list to get resolved name
      }
    } catch (err: any) {
      setError(err.message || 'Failed to add contact');
    } finally {
      setAdding(false);
    }
  };

  const [shareError, setShareError] = useState<string | null>(null);

  const openSharePicker = async (contact: Contact) => {
    setShareTarget(contact);
    setSelectedCard(null);
    setShareSuccess(false);
    setShareError(null);
    if (!session || !webId) return;
    try {
      const root = await getPodRoot(webId, session.fetch);
      if (root) {
        setCards(await getCards(root, session.fetch));
      }
    } catch (e) {
      console.error("Failed to load cards for sharing", e);
    }
  };

  const handleShare = async () => {
    if (!selectedCard || !shareTarget || !session) return;
    setSharing(true);
    setShareError(null);
    try {
      await shareCard(selectedCard, shareTarget.webId, webId!, session.fetch, selectedFold);
      setShareSuccess(true);
      setTimeout(() => {
        setShareTarget(null);
        setShareSuccess(false);
      }, 2000);
    } catch (e: any) {
      console.error("[Contacts] Failed to share card:", e);
      setShareError(`Error: ${e.message || e.toString()}`);
    } finally {
      setSharing(false);
    }
  };

  return (
    <div className="bg-stone-50 min-h-screen text-stone-900 p-6">
      <div className="max-w-md mx-auto">
        <button 
          onClick={onBack}
          className="flex items-center text-stone-500 hover:text-stone-700 mb-6 transition-colors"
        >
          <ArrowLeft size={20} className="mr-2" /> Back
        </button>

        <div className="flex items-center space-x-3 mb-8">
          <div className="w-12 h-12 bg-stone-500/10 text-stone-500 rounded-2xl flex items-center justify-center">
            <Users size={24} />
          </div>
          <h2 className="text-3xl font-bold tracking-tight">Contacts</h2>
        </div>

        <form onSubmit={handleAdd} className="mb-10 bg-white border border-stone-200 rounded-none p-5 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-stone-500/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
          <h3 className="text-lg font-semibold mb-4 relative z-10 flex items-center">
            <UserPlus size={18} className="mr-2 text-stone-400" />
            Add Contact
          </h3>
          {error && <div className="text-red-400 text-sm mb-4 bg-red-500/10 p-3 rounded-none">{error}</div>}
          <div className="flex flex-col space-y-3 relative z-10">
            <div className="relative">
              <LinkIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input 
                type="url"
                value={newWebId}
                onChange={e => setNewWebId(e.target.value)}
                placeholder="https://alice.example.com/profile/card#me"
                className="w-full bg-stone-50 border border-stone-300 rounded-none py-3 pl-9 pr-4 text-stone-800 text-sm focus:outline-none focus:border-stone-500 focus:ring-1 focus:ring-stone-500 transition-colors"
                required
              />
            </div>
            <button 
              type="submit"
              disabled={adding || !newWebId}
              className="bg-stone-600 hover:bg-stone-500 disabled:opacity-50 text-white font-medium py-3 px-4 rounded-none flex justify-center items-center transition-colors"
            >
              {adding ? <Loader2 className="animate-spin" size={20} /> : 'Add via WebID'}
            </button>
          </div>
        </form>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold mb-4 flex items-center justify-between">
            <span>Your Network</span>
            <span className="text-sm font-normal text-stone-500">{contacts.length} {contacts.length === 1 ? 'person' : 'people'}</span>
          </h3>
          
          {loading ? (
             <div className="flex justify-center p-8 text-stone-500"><Loader2 className="animate-spin" size={24} /></div>
          ) : contacts.length === 0 ? (
             <div className="text-center p-8 bg-white border border-dashed border-stone-200 rounded-none text-stone-500">
               No contacts yet. Add someone's WebID above.
             </div>
          ) : (
            contacts.map(c => (
              <div key={c.webId} className="bg-white border border-stone-200 rounded-none p-4 flex items-center space-x-4">
                <div className="w-10 h-10 bg-stone-100 rounded-full flex items-center justify-center text-stone-500 shrink-0">
                  {c.name ? c.name.charAt(0).toUpperCase() : <Users size={18} />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-stone-800 truncate">{c.name || 'Unknown Name'}</div>
                  <div className="text-xs text-stone-500 truncate flex items-center space-x-2">
                    <span className="truncate max-w-[120px]">{c.webId.split('/').slice(-2, -1)[0] || c.webId}</span>
                    {c.location && (
                      <span className="text-[10px] uppercase tracking-widest text-stone-400 bg-stone-100 px-1.5 py-0.5 rounded-none shrink-0 border border-stone-200">
                        {c.location}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => openSharePicker(c)}
                  className="w-9 h-9 rounded-full bg-stone-500/10 text-stone-500 flex items-center justify-center hover:bg-stone-500/20 transition-colors shrink-0"
                  title="Share a card"
                >
                  <Send size={16} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Share Card Picker Overlay */}
      {shareTarget && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm" onClick={() => setShareTarget(null)} />
          <div className="relative bg-white border-t border-stone-200 rounded-none p-6 shadow-2xl pb-10">
            <button onClick={() => setShareTarget(null)} className="absolute top-4 right-4 text-stone-400 hover:text-stone-700">
              <X size={24} />
            </button>
            
            {shareSuccess ? (
              <div className="bg-green-500/10 border border-green-500/30 text-green-600 p-6 rounded-none text-center">
                <h4 className="font-bold mb-2">Card Shared!</h4>
                <p className="text-sm">A notification has been sent to {shareTarget.name || 'their'} pod inbox.</p>
              </div>
            ) : (
              <>
                <h3 className="text-xl font-bold text-stone-900 mb-1">Share a Card</h3>
                <p className="text-sm text-stone-500 mb-6">
                  To <span className="font-medium text-stone-700">{shareTarget.name || shareTarget.webId}</span>
                </p>

                {cards.length === 0 ? (
                  <div className="text-stone-500 text-sm bg-stone-50 p-4 rounded-none border border-stone-200">
                    You haven't created any cards yet. Go back and create one first.
                  </div>
                ) : (
                  <div className="space-y-3 mb-6">
                    {cards.map(c => (
                      <button
                        key={c.url}
                        onClick={() => setSelectedCard(c.url)}
                        className={`w-full text-left p-4 rounded-none border transition-colors flex items-center justify-between ${
                          selectedCard === c.url
                            ? 'bg-stone-500/10 border-stone-500'
                            : 'bg-stone-50 border-stone-200 hover:border-stone-400'
                        }`}
                      >
                        <div>
                          <div className="font-medium text-stone-800">{c.label}</div>
                          <div className="text-xs text-stone-500">{c.fields.length} fields{c.background ? ' · has background' : ''}{c.message ? ' · has message' : ''}</div>
                        </div>
                        {selectedCard === c.url && (
                          <div className="w-6 h-6 bg-stone-500 rounded-full flex items-center justify-center">
                            <Check size={14} className="text-white" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
                
                {cards.length > 0 && (
                  <div className="mb-8">
                    <label className="block text-sm font-medium text-stone-500 mb-2">
                      Fold a Corner (Optional)
                    </label>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setSelectedFold('none')}
                        className={`flex-1 py-2 text-xs font-medium rounded-none border transition-colors ${selectedFold === 'none' ? 'bg-stone-600 text-white border-stone-600' : 'bg-stone-50 text-stone-600 border-stone-200 hover:border-stone-400'}`}
                      >
                        None
                      </button>
                      <button
                        onClick={() => setSelectedFold('tl')}
                        className={`flex-1 py-2 text-xs font-medium rounded-none border transition-colors ${selectedFold === 'tl' ? 'bg-stone-600 text-white border-stone-600' : 'bg-stone-50 text-stone-600 border-stone-200 hover:border-stone-400'}`}
                      >
                        Upper Left
                      </button>
                      <button
                        onClick={() => setSelectedFold('tr')}
                        className={`flex-1 py-2 text-xs font-medium rounded-none border transition-colors ${selectedFold === 'tr' ? 'bg-stone-600 text-white border-stone-600' : 'bg-stone-50 text-stone-600 border-stone-200 hover:border-stone-400'}`}
                      >
                        Upper Right
                      </button>
                    </div>
                    <div className="mt-2 text-[10px] text-stone-400 uppercase tracking-widest text-center">
                      Left = Long Visit · Right = Short Visit
                    </div>
                  </div>
                )}

                {shareError && (
                  <div className="text-red-500 text-sm bg-red-500/10 p-3 rounded-none border border-red-500/20 mb-4">
                    {shareError}
                  </div>
                )}

                <button
                  onClick={handleShare}
                  disabled={!selectedCard || sharing}
                  className="w-full bg-stone-600 hover:bg-stone-500 disabled:opacity-50 text-white font-medium py-4 px-4 rounded-none flex items-center justify-center transition-colors"
                >
                  {sharing ? <Loader2 className="animate-spin mr-2" size={20} /> : <Send size={20} className="mr-2" />}
                  Share Card
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
