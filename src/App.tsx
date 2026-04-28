import { PhoneCall } from 'lucide-react';

function App() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-950 text-zinc-50 p-6 text-center">
      <div className="w-16 h-16 bg-zinc-900 rounded-[24px] flex items-center justify-center shadow-2xl shadow-zinc-900/50 mb-8 border border-zinc-800">
        <PhoneCall size={32} className="text-zinc-50" />
      </div>
      <h1 className="text-4xl font-bold tracking-tight mb-4">Call Me</h1>
      <p className="text-zinc-400 text-lg mb-8 max-w-sm leading-relaxed">
        Your data, your contacts, your context. Share context-specific projections of your pod data in one tap.
      </p>
      
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-sm text-left">
        <h2 className="text-xl font-semibold mb-2">Phase 0 Complete</h2>
        <p className="text-sm text-zinc-400">
          The React / Vite / Tailwind development environment is ready. Start Phase 1 to implement Solid pod authentication.
        </p>
      </div>
    </div>
  );
}

export default App;
