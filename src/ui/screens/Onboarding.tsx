import React, { useEffect, useState } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { getProfileFields, saveCard } from '../../pod/cards';
import { getPodRoot } from '../../pod/bootstrap';
import { getSolidDataset, getContainedResourceUrlAll } from '@inrupt/solid-client';
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
  const [message, setMessage] = useState('');
  const [backgrounds, setBackgrounds] = useState<string[]>([]);
  const [bgBlobUrls, setBgBlobUrls] = useState<Record<string, string>>({});
  const [selectedBackground, setSelectedBackground] = useState<string | null>(null);
  const [cardColor, setCardColor] = useState<string>('#F0EAD6'); // Default to Eggshell White
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadFields() {
      if (!session || !webId) return;
      const root = await getPodRoot(webId, session.fetch);
      
      try {
        const available = await getProfileFields(webId, session.fetch);
        setFields(available);
      } catch (e) {
        console.warn("Could not load fields", e);
      }

      if (root) {
        try {
          const ds = await getSolidDataset(`${root}images/`, { fetch: session.fetch });
          const urls = getContainedResourceUrlAll(ds);
          const imageUrls = urls.filter(u => /\.(jpg|jpeg|png|gif|webp)$/i.test(u));
          setBackgrounds(imageUrls);

          // Fetch each image as an authenticated blob for thumbnails
          const blobMap: Record<string, string> = {};
          await Promise.all(imageUrls.map(async (imgUrl) => {
            try {
              const res = await session.fetch(imgUrl);
              const blob = await res.blob();
              blobMap[imgUrl] = URL.createObjectURL(blob);
            } catch (e) {
              console.warn("Could not fetch image blob for", imgUrl, e);
            }
          }));
          setBgBlobUrls(blobMap);
        } catch (e) {
          console.warn("Could not load images", e);
        }
      }

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
        await saveCard(root, cardName, cardName, Array.from(selectedFields), selectedBackground || undefined, message.trim() || undefined, cardColor, session.fetch);
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
      <div className="flex flex-col items-center py-20 text-stone-9000">
        <Loader2 className="animate-spin mb-4" size={24} />
        Scanning your profile...
      </div>
    );
  }

  return (
    <div className="bg-white border border-stone-200 rounded-none p-6 shadow-2xl">
      <h2 className="text-2xl font-bold text-stone-900 mb-2">Create a Card</h2>
      <p className="text-stone-500 mb-6 text-sm">
        A card is a contextual projection of your profile. Pick which fields this card will expose.
      </p>

      <div className="mb-6">
        <label className="block text-sm font-medium text-stone-500 mb-2">Card Name</label>
        <input 
          type="text"
          value={cardName}
          onChange={(e) => setCardName(e.target.value)}
          className="w-full bg-stone-50 border border-stone-200 rounded-none py-3 px-4 text-stone-800 focus:outline-none focus:border-stone-500"
          placeholder="e.g. Personal, Professional, Dating"
        />
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-stone-500 mb-2">Message (Optional)</label>
        <textarea 
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full bg-stone-50 border border-stone-200 rounded-none py-3 px-4 text-stone-800 focus:outline-none focus:border-stone-500"
          placeholder="e.g. Hope to catch up soon!"
          rows={2}
        />
      </div>

      <div className="mb-8">
        <label className="block text-sm font-medium text-stone-500 mb-2">Include Profile Fields</label>
        {fields.length === 0 ? (
          <div className="text-sm text-yellow-500/80 bg-yellow-500/10 p-4 rounded-none border border-yellow-500/20">
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
                  className={`flex items-center justify-between p-4 rounded-none cursor-pointer border transition-colors ${
                    isSelected ? 'bg-stone-500/10 border-stone-500/30' : 'bg-stone-100/50 border-stone-200 hover:border-stone-300'
                  }`}
                >
                  <div>
                    <div className="font-medium text-stone-700">{f.label}</div>
                    <div className="text-xs text-stone-9000 truncate max-w-[200px]">{f.value}</div>
                  </div>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                    isSelected ? 'bg-stone-500 text-white' : 'bg-stone-200 text-transparent'
                  }`}>
                    <Check size={14} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="mb-8">
        <label className="block text-sm font-medium text-stone-500 mb-2">Card Background</label>
        {backgrounds.length === 0 ? (
           <div className="text-sm text-stone-500 italic bg-stone-50 p-3 rounded-none border border-stone-200">
             To pick images, place them inside the `/images/` folder on your pod.
           </div>
        ) : (
           <div className="flex space-x-4 overflow-x-auto pb-4 scrollbar-hide">
              <div 
                className={`w-20 h-20 shrink-0 rounded-none cursor-pointer border-2 shadow-sm flex items-center justify-center transition-all ${selectedBackground === null ? 'border-stone-500 bg-stone-100' : 'border-stone-200 bg-white hover:border-stone-400'}`}
                onClick={() => { setSelectedBackground(null); if (!cardColor) setCardColor('#F0EAD6'); }}
              >
                 <span className="text-xs text-stone-500">None</span>
              </div>
              {backgrounds.map(bg => (
                 <img 
                   key={bg} 
                   src={bgBlobUrls[bg] || ''} 
                   alt="Background option"
                   onClick={() => { setSelectedBackground(bg); setCardColor(''); }}
                   className={`w-20 h-20 shrink-0 rounded-none cursor-pointer object-cover shadow-sm border-2 transition-all ${selectedBackground === bg ? 'border-stone-500' : 'border-stone-200 hover:border-stone-400'}`} 
                 />
              ))}
           </div>
        )}
      </div>

      <div className="mb-8">
        <label className="block text-sm font-medium text-stone-500 mb-2">Card Colour</label>
        <div className="flex space-x-3">
          {[
            { name: 'Eggshell White', hex: '#F0EAD6' },
            { name: 'Duck Egg Blue', hex: '#E0EFEF' },
            { name: 'Sage Green', hex: '#C7D3C4' },
            { name: 'Pale Pink', hex: '#EED4D3' },
            { name: 'Pale Yellow', hex: '#F4E8C1' }
          ].map(color => (
            <div
              key={color.hex}
              onClick={() => { setCardColor(color.hex); setSelectedBackground(null); }}
              className={`w-10 h-10 rounded-full cursor-pointer shadow-sm border-2 transition-transform ${cardColor === color.hex ? 'border-stone-400 scale-110' : 'border-stone-200 hover:scale-105'}`}
              style={{ backgroundColor: color.hex }}
              title={color.name}
            />
          ))}
        </div>
      </div>

      <button 
        onClick={handleSave}
        disabled={saving || !cardName}
        className="w-full bg-stone-600 hover:bg-stone-500 disabled:opacity-50 text-white font-medium py-4 px-4 rounded-none flex items-center justify-center transition-colors"
      >
        {saving ? <Loader2 className="animate-spin" size={20} /> : <><Plus size={20} className="mr-2" /> Save Card</>}
      </button>
    </div>
  );
};
