import React, { useEffect, useState } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { getProfileFields, saveCard } from '../../pod/cards';
import { getPodRoot } from '../../pod/bootstrap';
import { Check, Plus, Loader2 } from 'lucide-react';
import { VOCAB } from '../../vocab';

interface OnboardingProps {
  onComplete: () => void;
}

export const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const { session, webId } = useAuth();
  const [fields, setFields] = useState<{uri: string, label: string, value: string}[]>([]);
  const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set([VOCAB.FOAF.name]));
  const [cardName, setCardName] = useState('Personal');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadFields() {
      if (!session || !webId) return;
      const available = await getProfileFields(webId, session.fetch);
      setFields(available);
      setLoading(false);
    }
    loadFields();
  }, [session, webId]);

  const toggleField = (uri: string) => {
    const newSelected = new Set(selectedFields);
    if (newSelected.has(uri)) {
      newSelected.delete(uri);
    } else {
      newSelected.add(uri);
    }
    setSelectedFields(newSelected);
  };

  const handleSave = async () => {
    if (!session || !webId) return;
    setSaving(true);
    try {
      // Re-use our robust pod root discovery logic here or just pass it in. 
      // For simplicity, let's do naive root or export the one from bootstrap
      const root = await getPodRoot(webId, session.fetch);
      if (root) {
        await saveCard(root, cardName, cardName, Array.from(selectedFields), session.fetch);
        onComplete();
      }
    } catch (e) {
      console.error("Failed to save card", e);
    } finally {
      setSaving(false);
    }
  };

  // We need the getPodRoot function here since it wasn't exported in bootstrap correctly in Phase 1
  // Wait, I will export it from bootstrap or just copy it here temporarily if not.
  // Actually, I can just update bootstrap to export getPodRoot! I will do that via a tool call.

  if (loading) {
    return (
      <div className="flex flex-col items-center py-20 text-zinc-500">
        <Loader2 className="animate-spin mb-4" size={24} />
        Scanning your profile...
      </div>
    );
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl">
      <h2 className="text-2xl font-bold text-zinc-50 mb-2">Create a Card</h2>
      <p className="text-zinc-400 mb-6 text-sm">
        A card is a contextual projection of your profile. Pick which fields this card will expose.
      </p>

      <div className="mb-6">
        <label className="block text-sm font-medium text-zinc-400 mb-2">Card Name</label>
        <input 
          type="text"
          value={cardName}
          onChange={(e) => setCardName(e.target.value)}
          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-zinc-100 focus:outline-none focus:border-blue-500"
          placeholder="e.g. Personal, Professional, Dating"
        />
      </div>

      <div className="mb-8">
        <label className="block text-sm font-medium text-zinc-400 mb-2">Include Profile Fields</label>
        {fields.length === 0 ? (
          <div className="text-sm text-yellow-500/80 bg-yellow-500/10 p-4 rounded-xl border border-yellow-500/20">
            We couldn't find many fields on your WebID profile. You can still create an empty card, or add data to your pod first.
          </div>
        ) : (
          <div className="space-y-3">
            {fields.map(f => {
              const isSelected = selectedFields.has(f.uri);
              return (
                <div 
                  key={f.uri} 
                  onClick={() => toggleField(f.uri)}
                  className={`flex items-center justify-between p-4 rounded-xl cursor-pointer border transition-colors ${
                    isSelected ? 'bg-blue-500/10 border-blue-500/30' : 'bg-zinc-800/50 border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  <div>
                    <div className="font-medium text-zinc-200">{f.label}</div>
                    <div className="text-xs text-zinc-500 truncate max-w-[200px]">{f.value}</div>
                  </div>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                    isSelected ? 'bg-blue-500 text-white' : 'bg-zinc-700 text-transparent'
                  }`}>
                    <Check size={14} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <button 
        onClick={handleSave}
        disabled={saving || !cardName}
        className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium py-4 px-4 rounded-xl flex items-center justify-center transition-colors"
      >
        {saving ? <Loader2 className="animate-spin" size={20} /> : <><Plus size={20} className="mr-2" /> Save Card</>}
      </button>
    </div>
  );
};
