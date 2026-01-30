import { ReactNode } from 'react';
import { useAuth } from 'react-oidc-context';

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const auth = useAuth();

  if (auth.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-blue-500">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (auth.error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-500">
        <div className="bg-white rounded-lg p-6 max-w-md">
          <h2 className="text-xl font-bold text-red-600 mb-2">Authentication Error</h2>
          <p className="text-gray-700">{auth.error.message}</p>
          <button
            onClick={() => auth.signinRedirect()}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!auth.isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-blue-500">
        <div className="bg-white rounded-lg p-6 max-w-md text-center">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Authentication Required</h2>
          <p className="text-gray-600 mb-4">Please sign in to access this page.</p>
          <button
            onClick={() => auth.signinRedirect()}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
