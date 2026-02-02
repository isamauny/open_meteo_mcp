import { useAuth } from 'react-oidc-context';

interface LoginButtonProps {
  large?: boolean;
}

export function LoginButton({ large = false }: LoginButtonProps) {
  const auth = useAuth();

  const handleSignIn = async () => {
    try {
      await auth.signinRedirect();
    } catch (error) {
      console.error('Sign-in error:', error);
      alert(`Sign-in failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  if (auth.isLoading) {
    return (
      <div className={`${large ? 'px-6 py-3' : 'px-4 py-2'} bg-white/30 rounded-lg text-white`}>
        Loading...
      </div>
    );
  }

  if (auth.error) {
    return (
      <div className="text-red-200 text-sm">
        Auth error: {auth.error.message}
      </div>
    );
  }

  if (auth.isAuthenticated) {
    const user = auth.user;
    const displayName = user?.profile?.name || user?.profile?.preferred_username || 'User';

    const handleSignOut = async () => {
      try {
        // For Asgardeo MCP Client Apps, use local logout
        // MCP Client Apps may not support standard OIDC RP-initiated logout
        console.log('Signing out (local session clear)...');

        await auth.removeUser();

        console.log('Session cleared successfully');

        // Clear any additional storage
        sessionStorage.clear();

        // Redirect to home page
        window.location.href = '/';
      } catch (error) {
        console.error('Logout error:', error);

        // Force clear and redirect even if error occurs
        try {
          sessionStorage.clear();
        } catch (e) {
          console.error('Failed to clear sessionStorage:', e);
        }

        // Redirect anyway
        window.location.href = '/';
      }
    };

    return (
      <div className="flex items-center gap-4">
        <div className="text-white">
          <span className="text-sm opacity-80">Signed in as</span>
          <p className="font-semibold">{displayName}</p>
        </div>
        <button
          onClick={handleSignOut}
          className={`
            ${large ? 'px-6 py-3 text-lg' : 'px-4 py-2'}
            bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors
            backdrop-blur-sm border border-white/30
          `}
        >
          Sign Out
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleSignIn}
      className={`
        ${large ? 'px-8 py-4 text-lg' : 'px-4 py-2'}
        bg-white text-blue-600 font-semibold rounded-lg
        hover:bg-blue-50 transition-colors shadow-lg
      `}
    >
      Sign In
    </button>
  );
}
