import { useState } from 'react';
import { login } from '@inrupt/solid-client-authn-browser';
import { LogIn, Globe } from 'lucide-react';

export const LoginScreen = () => {
  const [customIdp, setCustomIdp] = useState('https://solidcommunity.net');

  const handleLogin = async (issuer: string) => {
    await login({
      oidcIssuer: issuer,
      redirectUrl: window.location.href,
      clientName: "Call Me",
    });
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-stone-50 p-6">
      <div className="w-full max-w-md bg-white border border-stone-200 rounded-3xl p-8 shadow-2xl">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-stone-500/10 text-stone-500 rounded-2xl flex items-center justify-center">
            <LogIn size={32} />
          </div>
        </div>
        
        <h1 className="text-3xl font-bold text-center text-stone-900 mb-2">Login with Solid</h1>
        <p className="text-stone-500 text-center mb-8">Access your pod to start sharing your card contextually.</p>
        
        <div className="space-y-3 mb-6">
          <button 
            onClick={() => handleLogin('https://login.inrupt.com')}
            className="w-full bg-stone-100 hover:bg-stone-200 text-stone-800 font-medium py-3 px-4 rounded-xl transition-colors duration-200"
          >
            Inrupt PodSpaces
          </button>
          
          <button 
            onClick={() => handleLogin('https://solidcommunity.net')}
            className="w-full bg-stone-100 hover:bg-stone-200 text-stone-800 font-medium py-3 px-4 rounded-xl transition-colors duration-200"
          >
            SolidCommunity.net
          </button>
          
          <button 
            onClick={() => handleLogin('https://solidweb.org')}
            className="w-full bg-stone-100 hover:bg-stone-200 text-stone-800 font-medium py-3 px-4 rounded-xl transition-colors duration-200"
          >
            SolidWeb.org
          </button>
        </div>

        <div className="relative flex items-center py-4">
          <div className="flex-grow border-t border-stone-200"></div>
          <span className="flex-shrink-0 mx-4 text-stone-9000 text-sm">or custom</span>
          <div className="flex-grow border-t border-stone-200"></div>
        </div>

        <div className="mt-2 text-left">
          <label className="block text-sm font-medium text-stone-500 mb-2">Custom Provider URL</label>
          <div className="flex items-center space-x-2">
            <div className="flex-grow relative">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-9000" size={18} />
              <input 
                type="url"
                value={customIdp}
                onChange={(e) => setCustomIdp(e.target.value)}
                className="w-full bg-stone-50 border border-stone-200 rounded-xl py-3 pl-10 pr-4 text-stone-800 focus:outline-none focus:border-stone-500 focus:ring-1 focus:ring-stone-500"
                placeholder="https://yourpod.example"
              />
            </div>
            <button 
              onClick={() => handleLogin(customIdp)}
              disabled={!customIdp}
              className="bg-stone-600 hover:bg-stone-500 disabled:opacity-50 text-white font-medium py-3 px-4 rounded-xl transition-colors duration-200"
            >
              Go
            </button>
          </div>
        </div>

        <div className="mt-8 text-center">
          <a href="https://solidproject.org/" target="_blank" rel="noreferrer" className="text-stone-9000 hover:text-stone-600 text-sm underline decoration-zinc-700 underline-offset-4 decoration-1">
            What's a Pod?
          </a>
        </div>
      </div>
    </div>
  );
};
