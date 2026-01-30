import { useQuery } from '@tanstack/react-query';
import { useAuth } from 'react-oidc-context';
import { getAirQuality, getAirQualityDetails, initializeSession } from '../services/mcpClient';

/**
 * Hook to get air quality for a city.
 */
export function useAirQuality(city: string | null, variables?: string[]) {
  const auth = useAuth();
  const accessToken = auth.user?.access_token;

  return useQuery({
    queryKey: ['airQuality', city, variables],
    queryFn: async () => {
      if (!city) throw new Error('City is required');

      // Initialize session if needed
      await initializeSession(accessToken);

      const result = await getAirQuality(city, variables, accessToken);
      return result;
    },
    enabled: !!city && auth.isAuthenticated,
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
}

/**
 * Hook to get detailed air quality data for a city.
 */
export function useAirQualityDetails(city: string | null, variables?: string[]) {
  const auth = useAuth();
  const accessToken = auth.user?.access_token;

  return useQuery({
    queryKey: ['airQuality', 'details', city, variables],
    queryFn: async () => {
      if (!city) throw new Error('City is required');

      // Initialize session if needed
      await initializeSession(accessToken);

      const result = await getAirQualityDetails(city, variables, accessToken);

      // Parse JSON response
      try {
        return JSON.parse(result);
      } catch {
        return result;
      }
    },
    enabled: !!city && auth.isAuthenticated,
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
}
