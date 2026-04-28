import React, { useEffect, useState } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { getPodRoot } from '../../pod/bootstrap';
import { getContacts, addContact } from '../../pod/contacts';
import { Contact } from '../../types';
import { Loader2, UserPlus, Users, Link as LinkIcon, Check, ArrowLeft } from 'lucide-react';

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

  const loadContacts = async () => {
    if (!session || !webId) return;
    try {
      const root = await getPodRoot(webId, session.fetch);
      if (root) {
        const data = await getContacts(root, session.fetch);
        setContacts(data);
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
        await addContact(root, webId, newWebId, session.fetch);
        setNewWebId('');
        await loadContacts(); // Refresh list to get resolved name
      }
    } catch (err: any) {
      setError(err.message || 'Failed to add contact');
    } finally {
      setAdding(false);
    }
  };

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
            <Users size={24} />
          </div>
          <h2 className="text-3xl font-bold tracking-tight">Contacts</h2>
        </div>

        <form onSubmit={handleAdd} className="mb-10 bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
          <h3 className="text-lg font-semibold mb-4 relative z-10 flex items-center">
            <UserPlus size={18} className="mr-2 text-blue-400" />
            Add Contact
          </h3>
          {error && <div className="text-red-400 text-sm mb-4 bg-red-500/10 p-3 rounded-lg">{error}</div>}
          <div className="flex flex-col space-y-3 relative z-10">
            <div className="relative">
              <LinkIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input 
                type="url"
                value={newWebId}
                onChange={e => setNewWebId(e.target.value)}
                placeholder="https://alice.example.com/profile/card#me"
                className="w-full bg-zinc-950 border border-zinc-700 rounded-xl py-3 pl-9 pr-4 text-zinc-100 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                required
              />
            </div>
            <button 
              type="submit"
              disabled={adding || !newWebId}
              className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium py-3 px-4 rounded-xl flex justify-center items-center transition-colors"
            >
              {adding ? <Loader2 className="animate-spin" size={20} /> : 'Add via WebID'}
            </button>
          </div>
        </form>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold mb-4 flex items-center justify-between">
            <span>Your Network</span>
            <span className="text-sm font-normal text-zinc-500">{contacts.length} {contacts.length === 1 ? 'person' : 'people'}</span>
          </h3>
          
          {loading ? (
             <div className="flex justify-center p-8 text-zinc-500"><Loader2 className="animate-spin" size={24} /></div>
          ) : contacts.length === 0 ? (
             <div className="text-center p-8 bg-zinc-900 border border-dashed border-zinc-800 rounded-2xl text-zinc-500">
               No contacts yet. Add someone's WebID above.
             </div>
          ) : (
            contacts.map(c => (
              <div key={c.webId} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center space-x-4">
                <div className="w-10 h-10 bg-zinc-800 rounded-full flex items-center justify-center text-zinc-400 shrink-0">
                  {c.name ? c.name.charAt(0).toUpperCase() : <Users size={18} />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-zinc-100 truncate">{c.name || 'Unknown Name'}</div>
                  <div className="text-xs text-zinc-500 truncate">{c.webId}</div>
                </div>
                <div className="text-green-500 shrink-0" title="Location shared">
                  <Check size={18} />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
