import { useQuery } from '@tanstack/react-query';
import { useAuth } from 'react-oidc-context';
import { getWeatherDetails, initializeSession } from '../services/mcpClient';
import type { WeatherData } from '../types/weather';

/**
 * Hook to get current weather for a city.
 */
export function useCurrentWeather(city: string | null) {
  const auth = useAuth();
  const accessToken = auth.user?.access_token;

  return useQuery<WeatherData>({
    queryKey: ['weather', 'current', city],
    queryFn: async () => {
      if (!city) throw new Error('City is required');

      // Initialize session if needed
      await initializeSession(accessToken);

      const result = await getWeatherDetails(city, false, accessToken);
      const parsed = JSON.parse(result);

      // Check for error responses from the server
      if (parsed.error) {
        const errorMessage = parsed.message || parsed.error;
        throw new Error(errorMessage);
      }

      return parsed;
    },
    enabled: !!city && auth.isAuthenticated,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook to get detailed weather data for a city.
 */
export function useWeatherDetails(city: string | null, includeForecast: boolean = false) {
  const auth = useAuth();
  const accessToken = auth.user?.access_token;

  return useQuery({
    queryKey: ['weather', 'details', city, includeForecast],
    queryFn: async () => {
      if (!city) throw new Error('City is required');

      // Initialize session if needed
      await initializeSession(accessToken);

      const result = await getWeatherDetails(city, includeForecast, accessToken);

      // Parse JSON response
      try {
        return JSON.parse(result);
      } catch {
        return result;
      }
    },
    enabled: !!city && auth.isAuthenticated,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
