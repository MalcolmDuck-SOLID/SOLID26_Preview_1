import React, { useEffect, useState } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { bootstrapPod } from '../../pod/bootstrap';
import { LogOut, Loader2, PhoneCall } from 'lucide-react';

export const Home = () => {
  const { session, userName, webId, logout } = useAuth();
  const [bootstrapping, setBootstrapping] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function initPod() {
      if (session && webId) {
        try {
          // Initialize the pod directories
          await bootstrapPod(webId, session.fetch);
        } catch (e: any) {
          setError(e.message || "Failed to bootstrap pod.");
        } finally {
          setBootstrapping(false);
        }
      }
    }
    
    initPod();
  }, [session, webId]);

  if (bootstrapping) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-zinc-50">
        <Loader2 className="animate-spin mb-4 text-blue-500" size={32} />
        <p className="text-zinc-400">Configuring your pod for Call Me...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 p-6">
      <header className="max-w-md mx-auto flex items-center justify-between py-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-zinc-900 rounded-xl flex items-center justify-center border border-zinc-800">
            <PhoneCall size={20} className="text-blue-500" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">Call Me</h1>
        </div>
        <button 
          onClick={logout}
          className="w-10 h-10 bg-zinc-900 hover:bg-zinc-800 rounded-xl flex items-center justify-center text-red-400 transition-colors"
          title="Sign out"
        >
          <LogOut size={18} />
        </button>
      </header>

      <main className="max-w-md mx-auto mt-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Welcome, {userName || 'Traveler'}</h2>
          <p className="text-zinc-400 text-sm break-all">
            {webId}
          </p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-2xl mb-8 text-sm">
            {error}
          </div>
        )}

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl">
          <h3 className="text-lg font-semibold mb-2">Phase 1 Complete ✓</h3>
          <p className="text-zinc-400 text-sm">
            You successfully authenticated with your Solid Identity Provider and your pod has been bootstrapped for "Call Me".
          </p>
        </div>
      </main>
    </div>
  );
};
