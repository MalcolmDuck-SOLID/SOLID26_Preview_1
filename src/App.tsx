import React from 'react';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { LoginScreen } from './ui/screens/Login';
import { Home } from './ui/screens/Home';
import { Loader2 } from 'lucide-react';

const MainApp = () => {
  const { isLoggedIn, session } = useAuth();

  // Very brief loading state representation right after mount
  return isLoggedIn ? <Home /> : <LoginScreen />;
};

function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}

export default App;
