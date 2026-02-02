import { useState } from 'react';
import type { AirQualityData } from '../types/weather';
import { ScopeRequiredError } from '../types/errors';
import { ScopeRequiredCard } from './ScopeRequiredCard';

interface AirQualityCardProps {
  airQualityData?: AirQualityData | null;
  isLoading: boolean;
  error?: Error | null;
}

type QualityLevel = 'good' | 'moderate' | 'unhealthy-sensitive' | 'unhealthy' | 'very-unhealthy' | 'hazardous' | 'unknown';

function getQualityLevelFromPM25(pm25?: number): QualityLevel {
  if (pm25 === undefined) return 'unknown';
  if (pm25 <= 12) return 'good';
  if (pm25 <= 35) return 'moderate';
  if (pm25 <= 55) return 'unhealthy-sensitive';
  if (pm25 <= 150) return 'unhealthy';
  if (pm25 <= 250) return 'very-unhealthy';
  return 'hazardous';
}

function getHealthAdvice(pm25?: number): string {
  if (pm25 === undefined) return 'Air quality data unavailable.';
  if (pm25 <= 12) return 'Air quality is good. Safe for outdoor activities.';
  if (pm25 <= 35) return 'Air quality is acceptable. Sensitive individuals should consider reducing prolonged outdoor exertion.';
  if (pm25 <= 55) return 'Sensitive groups should limit outdoor activities.';
  if (pm25 <= 150) return 'Everyone should reduce outdoor activities. Sensitive groups should avoid outdoor activities.';
  if (pm25 <= 250) return 'Everyone should avoid outdoor activities. Sensitive groups should remain indoors.';
  return 'Health alert: Everyone should avoid all outdoor activities and remain indoors.';
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

function PollutantMetric({ label, value, unit = '' }: { label: string; value?: number; unit?: string }) {
  if (value === undefined) return null;
  return (
    <div className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
      <span className="text-gray-600">{label}</span>
      <span className="font-medium text-gray-800">{value.toFixed(1)} {unit}</span>
    </div>
  );
}

export function AirQualityCard({ airQualityData, isLoading, error }: AirQualityCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

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
    // Check if this is a scope required error per MCP specification
    if (ScopeRequiredError.isScopeRequiredError(error)) {
      return (
        <ScopeRequiredCard
          requiredScopes={error.requiredScopes}
          availableScopes={error.availableScopes}
          message={error.message}
          resourceMetadataUrl={error.resourceMetadataUrl}
        />
      );
    }

    // Generic error display
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-red-700 mb-2">Air Quality Error</h3>
        <p className="text-red-600">{error.message}</p>
      </div>
    );
  }

  if (!airQualityData) {
    return null;
  }

  const aq = airQualityData.current_air_quality;
  const qualityLevel = getQualityLevelFromPM25(aq.pm2_5);
  const styles = getQualityStyles(qualityLevel);
  const healthAdvice = getHealthAdvice(aq.pm2_5);

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
          <PollutantMetric label="PM2.5" value={aq.pm2_5} unit="μg/m³" />
          <PollutantMetric label="PM10" value={aq.pm10} unit="μg/m³" />
          <PollutantMetric label="Ozone (O₃)" value={aq.ozone} unit="μg/m³" />
          <PollutantMetric label="NO₂" value={aq.nitrogen_dioxide} unit="μg/m³" />
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
          {(aq.carbon_monoxide !== undefined || aq.sulphur_dioxide !== undefined) && (
            <div className="mb-4">
              <h4 className="font-semibold text-gray-700 mb-2">Additional Pollutants</h4>
              <PollutantMetric label="Carbon Monoxide (CO)" value={aq.carbon_monoxide} unit="μg/m³" />
              <PollutantMetric label="Sulphur Dioxide (SO₂)" value={aq.sulphur_dioxide} unit="μg/m³" />
              <PollutantMetric label="Ammonia (NH₃)" value={aq.ammonia} unit="μg/m³" />
              <PollutantMetric label="Dust" value={aq.dust} unit="μg/m³" />
            </div>
          )}

          {/* Health advice */}
          <div className="mb-4">
            <h4 className="font-semibold text-gray-700 mb-2">Health Advice</h4>
            <p className="text-gray-600 text-sm">{healthAdvice}</p>
          </div>
        </div>
      )}
    </div>
  );
}
