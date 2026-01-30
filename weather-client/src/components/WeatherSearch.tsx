import { useState, FormEvent } from 'react';

interface WeatherSearchProps {
  onSearch: (city: string) => void;
  isLoading?: boolean;
}

export function WeatherSearch({ onSearch, isLoading = false }: WeatherSearchProps) {
  const [city, setCity] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (city.trim()) {
      onSearch(city.trim());
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="text"
        value={city}
        onChange={(e) => setCity(e.target.value)}
        placeholder="Enter city name (e.g., London)"
        className="flex-1 px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        disabled={isLoading}
      />
      <button
        type="submit"
        disabled={isLoading || !city.trim()}
        className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isLoading ? 'Loading...' : 'Search'}
      </button>
    </form>
  );
}
