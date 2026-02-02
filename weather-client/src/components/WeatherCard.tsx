import type { WeatherData } from '../types/weather';

interface WeatherCardProps {
  weatherData?: WeatherData | null;
  isLoading: boolean;
  error?: Error | null;
}

function degreesToCompass(degrees: number): string {
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round(degrees / 22.5) % 16;
  return directions[index];
}

function WeatherMetric({ label, value, icon }: { label: string; value?: string; icon: string }) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
      <span className="text-2xl">{icon}</span>
      <div>
        <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
        <p className="text-gray-800 font-medium">{value}</p>
      </div>
    </div>
  );
}

export function WeatherCard({ weatherData, isLoading, error }: WeatherCardProps) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/2 mb-6"></div>
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-16 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-red-700 mb-2">Error</h3>
        <p className="text-red-600">{error.message}</p>
      </div>
    );
  }

  if (!weatherData) {
    return null;
  }

  const windDirection = degreesToCompass(weatherData.wind_direction_degrees);

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center gap-3 mb-6">
        <span className="text-4xl">🌤️</span>
        <div>
          <h3 className="text-xl font-bold text-gray-800">
            {weatherData.city}
          </h3>
          <p className="text-gray-600">{weatherData.weather_description}</p>
        </div>
      </div>

      {/* Temperature display */}
      <div className="flex items-center justify-between mb-4 py-2 px-3 bg-blue-50 rounded-lg">
        <div className="flex items-center gap-2">
          <span className="text-gray-500 text-sm">Temp:</span>
          <span className="font-semibold text-gray-800">{weatherData.temperature_c}°C</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-500 text-sm">Feels like:</span>
          <span className="font-medium text-gray-700">{weatherData.apparent_temperature_c}°C</span>
        </div>
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-2 gap-3">
        <WeatherMetric label="Humidity" value={`${weatherData.relative_humidity_percent}%`} icon="💧" />
        <WeatherMetric label="Wind" value={`${weatherData.wind_speed_kmh} km/h ${windDirection}`} icon="💨" />
        <WeatherMetric label="Pressure" value={`${weatherData.pressure_hpa} hPa`} icon="🌡️" />
        <WeatherMetric label="Visibility" value={`${(weatherData.visibility_m / 1000).toFixed(1)} km`} icon="👁️" />
        <WeatherMetric label="UV Index" value={weatherData.uv_index.toFixed(1)} icon="☀️" />
        <WeatherMetric label="Cloud Cover" value={`${weatherData.cloud_cover_percent}%`} icon="☁️" />
      </div>
    </div>
  );
}
