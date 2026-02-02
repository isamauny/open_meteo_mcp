import { useState } from 'react';
import { WeatherSearch } from './WeatherSearch';
import { WeatherCard } from './WeatherCard';
import { AirQualityCard } from './AirQualityCard';
import { ToolsAccessCard } from './ToolsAccessCard';
import { useCurrentWeather } from '../hooks/useWeather';
import { useAirQuality } from '../hooks/useAirQuality';

export function WeatherDashboard() {
  const [searchCity, setSearchCity] = useState<string | null>(null);

  const weatherQuery = useCurrentWeather(searchCity);
  const airQualityQuery = useAirQuality(searchCity);

  const handleSearch = (city: string) => {
    setSearchCity(city);
  };

  const isLoading = weatherQuery.isLoading || airQualityQuery.isLoading;

  return (
    <div className="space-y-6">
      {/* Tools Access Card - shows which tools user can access */}
      <ToolsAccessCard />

      <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Search Weather</h2>
        <WeatherSearch onSearch={handleSearch} isLoading={isLoading} />
      </div>

      {searchCity && (
        <div className="grid md:grid-cols-2 gap-6">
          <WeatherCard
            weatherData={weatherQuery.data}
            isLoading={weatherQuery.isLoading}
            error={weatherQuery.error}
          />
          <AirQualityCard
            airQualityData={airQualityQuery.data}
            isLoading={airQualityQuery.isLoading}
            error={airQualityQuery.error}
          />
        </div>
      )}

      {!searchCity && (
        <div className="grid md:grid-cols-3 gap-6">
          <QuickCityCard city="London" onSelect={handleSearch} />
          <QuickCityCard city="New York" onSelect={handleSearch} />
          <QuickCityCard city="Tokyo" onSelect={handleSearch} />
          <QuickCityCard city="Sydney" onSelect={handleSearch} />
          <QuickCityCard city="Paris" onSelect={handleSearch} />
          <QuickCityCard city="Dubai" onSelect={handleSearch} />
        </div>
      )}
    </div>
  );
}

interface QuickCityCardProps {
  city: string;
  onSelect: (city: string) => void;
}

function QuickCityCard({ city, onSelect }: QuickCityCardProps) {
  return (
    <button
      onClick={() => onSelect(city)}
      className="bg-white/20 backdrop-blur-sm rounded-xl p-6 text-left hover:bg-white/30 transition-colors group"
    >
      <h3 className="text-xl font-semibold text-white group-hover:text-blue-100">
        {city}
      </h3>
      <p className="text-white/70 text-sm mt-1">Click to view weather</p>
    </button>
  );
}
