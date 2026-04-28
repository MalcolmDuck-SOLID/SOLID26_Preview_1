import { AuthProvider, useAuth } from './auth/AuthContext';
import { LoginScreen } from './ui/screens/Login';
import { Home } from './ui/screens/Home';
import { SharedCardView } from './ui/screens/SharedCardView';
import { Agentation } from 'agentation';

const MainApp = () => {
  const { isLoggedIn } = useAuth();

  // Check for shared card URL params
  const params = new URLSearchParams(window.location.search);
  const sharedCardUrl = params.get('card');
  const sharedFrom = params.get('from');

  if (sharedCardUrl && sharedFrom) {
    return (
      <SharedCardView
        cardUrl={sharedCardUrl}
        fromWebId={sharedFrom}
        onBack={() => {
          window.history.replaceState({}, '', window.location.pathname);
          window.location.reload();
        }}
      />
    );
  }

  return isLoggedIn ? <Home /> : <LoginScreen />;
};

function App() {
  return (
    <AuthProvider>
      <MainApp />
      <Agentation />
    </AuthProvider>
  );
}

export default App;
