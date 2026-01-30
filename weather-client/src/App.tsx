import { Routes, Route } from 'react-router-dom';
import { useAuth } from 'react-oidc-context';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LoginButton } from './components/LoginButton';
import { WeatherDashboard } from './components/WeatherDashboard';

function HomePage() {
  const auth = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-400 to-blue-600">
      <div className="container mx-auto px-4 py-8">
        <header className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-white">Weather App</h1>
          <LoginButton />
        </header>

        {auth.isAuthenticated ? (
          <WeatherDashboard />
        ) : (
          <div className="text-center py-20">
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-8 max-w-md mx-auto">
              <h2 className="text-2xl font-semibold text-white mb-4">
                Welcome to Weather App
              </h2>
              <p className="text-white/80 mb-6">
                Get real-time weather information and air quality data for any city.
                Please sign in to continue.
              </p>
              <LoginButton large />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CallbackPage() {
  const auth = useAuth();

  // Show loading while processing the callback
  if (auth.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-blue-500">
        <div className="text-white text-xl">Processing login...</div>
      </div>
    );
  }

  // Show error if authentication failed
  if (auth.error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-500">
        <div className="bg-white rounded-lg p-6 max-w-md">
          <h2 className="text-xl font-bold text-red-600 mb-2">Login Failed</h2>
          <p className="text-gray-700 mb-4">{auth.error.message}</p>
          <a
            href="/"
            className="inline-block px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Back to Home
          </a>
        </div>
      </div>
    );
  }

  // If authenticated, redirect to home
  if (auth.isAuthenticated) {
    window.location.href = '/';
    return (
      <div className="min-h-screen flex items-center justify-center bg-blue-500">
        <div className="text-white text-xl">Login successful! Redirecting...</div>
      </div>
    );
  }

  // Still processing or unknown state
  return (
    <div className="min-h-screen flex items-center justify-center bg-blue-500">
      <div className="text-white text-xl">Processing authentication...</div>
    </div>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/callback" element={<CallbackPage />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <WeatherDashboard />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default App;
