import React, { useState } from 'react';
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
    <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-950 p-6">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-2xl">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-blue-500/10 text-blue-500 rounded-2xl flex items-center justify-center">
            <LogIn size={32} />
          </div>
        </div>
        
        <h1 className="text-3xl font-bold text-center text-zinc-50 mb-2">Login with Solid</h1>
        <p className="text-zinc-400 text-center mb-8">Access your pod to start sharing your card contextually.</p>
        
        <div className="space-y-3 mb-6">
          <button 
            onClick={() => handleLogin('https://login.inrupt.com')}
            className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-medium py-3 px-4 rounded-xl transition-colors duration-200"
          >
            Inrupt PodSpaces
          </button>
          
          <button 
            onClick={() => handleLogin('https://solidcommunity.net')}
            className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-medium py-3 px-4 rounded-xl transition-colors duration-200"
          >
            SolidCommunity.net
          </button>
          
          <button 
            onClick={() => handleLogin('https://solidweb.org')}
            className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-medium py-3 px-4 rounded-xl transition-colors duration-200"
          >
            SolidWeb.org
          </button>
        </div>

        <div className="relative flex items-center py-4">
          <div className="flex-grow border-t border-zinc-800"></div>
          <span className="flex-shrink-0 mx-4 text-zinc-500 text-sm">or custom</span>
          <div className="flex-grow border-t border-zinc-800"></div>
        </div>

        <div className="mt-2 text-left">
          <label className="block text-sm font-medium text-zinc-400 mb-2">Custom Provider URL</label>
          <div className="flex items-center space-x-2">
            <div className="flex-grow relative">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
              <input 
                type="url"
                value={customIdp}
                onChange={(e) => setCustomIdp(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 pl-10 pr-4 text-zinc-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                placeholder="https://yourpod.example"
              />
            </div>
            <button 
              onClick={() => handleLogin(customIdp)}
              disabled={!customIdp}
              className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium py-3 px-4 rounded-xl transition-colors duration-200"
            >
              Go
            </button>
          </div>
        </div>

        <div className="mt-8 text-center">
          <a href="https://solidproject.org/" target="_blank" rel="noreferrer" className="text-zinc-500 hover:text-zinc-300 text-sm underline decoration-zinc-700 underline-offset-4 decoration-1">
            What's a Pod?
          </a>
        </div>
      </div>
    </div>
  );
};
