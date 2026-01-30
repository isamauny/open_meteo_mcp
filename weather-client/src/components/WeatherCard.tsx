import { useMemo } from 'react';

interface WeatherCardProps {
  weatherText: string;
  isLoading: boolean;
  error?: Error | null;
}

interface ParsedWeather {
  location?: string;
  temperature?: string;
  feelsLike?: string;
  conditions?: string;
  humidity?: string;
  wind?: string;
  pressure?: string;
  visibility?: string;
  uvIndex?: string;
  cloudCover?: string;
  rawLines: string[];
}

function parseWeatherText(text: string): ParsedWeather {
  const lines = text.split('\n').filter(line => line.trim());
  const result: ParsedWeather = { rawLines: [] };

  for (const line of lines) {
    const lowerLine = line.toLowerCase();

    // Extract key metrics
    if (lowerLine.includes('temperature') && !lowerLine.includes('feels')) {
      result.temperature = extractValue(line);
    } else if (lowerLine.includes('feels like') || lowerLine.includes('apparent')) {
      result.feelsLike = extractValue(line);
    } else if (lowerLine.includes('condition') || lowerLine.includes('weather:')) {
      result.conditions = extractValue(line);
    } else if (lowerLine.includes('humidity')) {
      result.humidity = extractValue(line);
    } else if (lowerLine.includes('wind') && !lowerLine.includes('gust')) {
      result.wind = extractValue(line);
    } else if (lowerLine.includes('pressure')) {
      result.pressure = extractValue(line);
    } else if (lowerLine.includes('visibility')) {
      result.visibility = extractValue(line);
    } else if (lowerLine.includes('uv')) {
      result.uvIndex = extractValue(line);
    } else if (lowerLine.includes('cloud')) {
      result.cloudCover = extractValue(line);
    } else if (line.startsWith('#') || line.includes('Weather for')) {
      result.location = line.replace(/^#+\s*/, '').replace('Weather for ', '').replace('Current Weather in ', '');
    } else {
      result.rawLines.push(line);
    }
  }

  return result;
}

function extractValue(line: string): string {
  if (line.includes(':')) {
    return line.split(':').slice(1).join(':').trim();
  }
  return line.replace(/^[-•*]\s*/, '').trim();
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

export function WeatherCard({ weatherText, isLoading, error }: WeatherCardProps) {
  const parsed = useMemo(() => parseWeatherText(weatherText || ''), [weatherText]);

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

  if (!weatherText) {
    return null;
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center gap-3 mb-6">
        <span className="text-4xl">🌤️</span>
        <div>
          <h3 className="text-xl font-bold text-gray-800">
            {parsed.location || 'Current Weather'}
          </h3>
          {parsed.conditions && (
            <p className="text-gray-600">{parsed.conditions}</p>
          )}
        </div>
      </div>

      {/* Temperature display */}
      {parsed.temperature && (
        <div className="flex items-center justify-between mb-4 py-2 px-3 bg-blue-50 rounded-lg">
          <div className="flex items-center gap-2">
            <span className="text-gray-500 text-sm">Temp:</span>
            <span className="font-semibold text-gray-800">{parsed.temperature}</span>
          </div>
          {parsed.feelsLike && (
            <div className="flex items-center gap-2">
              <span className="text-gray-500 text-sm">Feels like:</span>
              <span className="font-medium text-gray-700">{parsed.feelsLike}</span>
            </div>
          )}
        </div>
      )}

      {/* Metrics grid */}
      <div className="grid grid-cols-2 gap-3">
        <WeatherMetric label="Humidity" value={parsed.humidity} icon="💧" />
        <WeatherMetric label="Wind" value={parsed.wind} icon="💨" />
        <WeatherMetric label="Pressure" value={parsed.pressure} icon="🌡️" />
        <WeatherMetric label="Visibility" value={parsed.visibility} icon="👁️" />
        <WeatherMetric label="UV Index" value={parsed.uvIndex} icon="☀️" />
        <WeatherMetric label="Cloud Cover" value={parsed.cloudCover} icon="☁️" />
      </div>
    </div>
  );
}
