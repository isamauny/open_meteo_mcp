import { useState, useMemo } from 'react';

interface AirQualityCardProps {
  airQualityText: string;
  isLoading: boolean;
  error?: Error | null;
}

interface ParsedAirQuality {
  location?: string;
  overallStatus?: string;
  pm25?: string;
  pm10?: string;
  ozone?: string;
  no2?: string;
  co?: string;
  so2?: string;
  healthAdvice?: string[];
  rawLines: string[];
}

type QualityLevel = 'good' | 'moderate' | 'unhealthy-sensitive' | 'unhealthy' | 'very-unhealthy' | 'hazardous' | 'unknown';

function parseAirQualityText(text: string): ParsedAirQuality {
  const lines = text.split('\n').filter(line => line.trim());
  const result: ParsedAirQuality = { rawLines: [], healthAdvice: [] };

  for (const line of lines) {
    const lowerLine = line.toLowerCase();

    if (lowerLine.includes('pm2.5') || lowerLine.includes('pm2_5')) {
      result.pm25 = extractValue(line);
    } else if (lowerLine.includes('pm10')) {
      result.pm10 = extractValue(line);
    } else if (lowerLine.includes('ozone') || lowerLine.match(/\bo3\b/)) {
      result.ozone = extractValue(line);
    } else if (lowerLine.includes('nitrogen') || lowerLine.match(/\bno2\b/)) {
      result.no2 = extractValue(line);
    } else if (lowerLine.includes('carbon monoxide') || lowerLine.match(/\bco\b/)) {
      result.co = extractValue(line);
    } else if (lowerLine.includes('sulphur') || lowerLine.includes('sulfur') || lowerLine.match(/\bso2\b/)) {
      result.so2 = extractValue(line);
    } else if (lowerLine.includes('status') || lowerLine.includes('level') || lowerLine.includes('category')) {
      result.overallStatus = extractValue(line);
    } else if (lowerLine.includes('advice') || lowerLine.includes('recommend') || lowerLine.includes('health')) {
      result.healthAdvice?.push(line.replace(/^[-•*]\s*/, ''));
    } else if (line.startsWith('#')) {
      result.location = line.replace(/^#+\s*/, '');
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

function getQualityLevel(text: string): QualityLevel {
  const lower = text.toLowerCase();
  if (lower.includes('hazardous')) return 'hazardous';
  if (lower.includes('very unhealthy')) return 'very-unhealthy';
  if (lower.includes('unhealthy for sensitive') || lower.includes('sensitive groups')) return 'unhealthy-sensitive';
  if (lower.includes('unhealthy')) return 'unhealthy';
  if (lower.includes('moderate')) return 'moderate';
  if (lower.includes('good')) return 'good';
  return 'unknown';
}

function getQualityStyles(level: QualityLevel) {
  switch (level) {
    case 'good':
      return { bg: 'bg-green-50', border: 'border-green-500', badge: 'bg-green-500', text: 'Good' };
    case 'moderate':
      return { bg: 'bg-yellow-50', border: 'border-yellow-500', badge: 'bg-yellow-500', text: 'Moderate' };
    case 'unhealthy-sensitive':
      return { bg: 'bg-orange-50', border: 'border-orange-500', badge: 'bg-orange-500', text: 'Unhealthy for Sensitive Groups' };
    case 'unhealthy':
      return { bg: 'bg-red-50', border: 'border-red-500', badge: 'bg-red-500', text: 'Unhealthy' };
    case 'very-unhealthy':
      return { bg: 'bg-purple-50', border: 'border-purple-500', badge: 'bg-purple-500', text: 'Very Unhealthy' };
    case 'hazardous':
      return { bg: 'bg-rose-100', border: 'border-rose-700', badge: 'bg-rose-700', text: 'Hazardous' };
    default:
      return { bg: 'bg-gray-50', border: 'border-gray-300', badge: 'bg-gray-500', text: 'Unknown' };
  }
}

function PollutantMetric({ label, value, unit }: { label: string; value?: string; unit?: string }) {
  if (!value) return null;
  return (
    <div className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
      <span className="text-gray-600">{label}</span>
      <span className="font-medium text-gray-800">{value} {unit}</span>
    </div>
  );
}

export function AirQualityCard({ airQualityText, isLoading, error }: AirQualityCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const parsed = useMemo(() => parseAirQualityText(airQualityText || ''), [airQualityText]);
  const qualityLevel = useMemo(() => getQualityLevel(airQualityText || ''), [airQualityText]);
  const styles = getQualityStyles(qualityLevel);

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/2 mb-4"></div>
        <div className="h-12 bg-gray-200 rounded mb-4"></div>
        <div className="space-y-2">
          <div className="h-4 bg-gray-200 rounded w-full"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-red-700 mb-2">Air Quality Error</h3>
        <p className="text-red-600">{error.message}</p>
      </div>
    );
  }

  if (!airQualityText) {
    return null;
  }

  return (
    <div className={`rounded-xl shadow-lg overflow-hidden border-l-4 ${styles.border} ${styles.bg}`}>
      {/* Header - always visible */}
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🌬️</span>
            <h3 className="text-xl font-bold text-gray-800">Air Quality</h3>
          </div>
          <span className={`px-3 py-1 rounded-full text-white text-sm font-medium ${styles.badge}`}>
            {styles.text}
          </span>
        </div>

        {/* Key pollutants summary */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <PollutantMetric label="PM2.5" value={parsed.pm25} />
          <PollutantMetric label="PM10" value={parsed.pm10} />
          <PollutantMetric label="Ozone (O₃)" value={parsed.ozone} />
          <PollutantMetric label="NO₂" value={parsed.no2} />
        </div>

        {/* Expand/collapse button */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full py-2 text-center text-blue-600 hover:text-blue-800 font-medium flex items-center justify-center gap-2"
        >
          {isExpanded ? 'Show Less' : 'Show Full Report'}
          <span className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
            ▼
          </span>
        </button>
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-6 pb-6 border-t border-gray-200 pt-4">
          {/* Additional pollutants */}
          {(parsed.co || parsed.so2) && (
            <div className="mb-4">
              <h4 className="font-semibold text-gray-700 mb-2">Additional Pollutants</h4>
              <PollutantMetric label="Carbon Monoxide (CO)" value={parsed.co} />
              <PollutantMetric label="Sulphur Dioxide (SO₂)" value={parsed.so2} />
            </div>
          )}

          {/* Health advice */}
          {parsed.healthAdvice && parsed.healthAdvice.length > 0 && (
            <div className="mb-4">
              <h4 className="font-semibold text-gray-700 mb-2">Health Advice</h4>
              <ul className="space-y-1">
                {parsed.healthAdvice.map((advice, i) => (
                  <li key={i} className="text-gray-600 text-sm flex items-start gap-2">
                    <span className="text-blue-500">•</span>
                    {advice}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Raw data */}
          {parsed.rawLines.length > 0 && (
            <details className="mt-4">
              <summary className="cursor-pointer text-gray-500 text-sm hover:text-gray-700">
                View raw data ({parsed.rawLines.length} lines)
              </summary>
              <pre className="mt-2 p-3 bg-gray-100 rounded text-xs overflow-x-auto max-h-48 overflow-y-auto">
                {parsed.rawLines.join('\n')}
              </pre>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
