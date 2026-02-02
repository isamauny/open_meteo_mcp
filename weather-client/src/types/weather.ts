/**
 * Weather data types for the MCP client
 */

export interface WeatherData {
  city: string;
  latitude: number;
  longitude: number;
  time: string;
  temperature_c: number;
  apparent_temperature_c: number;
  relative_humidity_percent: number;
  dew_point_c: number;
  weather_code: number;
  weather_description: string;
  wind_speed_kmh: number;
  wind_direction_degrees: number;
  wind_gusts_kmh: number;
  precipitation_mm: number;
  rain_mm: number;
  snowfall_cm: number;
  precipitation_probability_percent: number;
  pressure_hpa: number;
  cloud_cover_percent: number;
  uv_index: number;
  visibility_m: number;
}

export interface HourlyForecast {
  time: string;
  temperature: number;
  humidity: number;
  precipitation_probability: number;
  weather_code: number;
}

export interface AirQualityData {
  city: string;
  latitude: number;
  longitude: number;
  current_air_quality: CurrentAirQuality;
  full_data?: unknown;
}

export interface CurrentAirQuality {
  time: string;
  pm2_5?: number;
  pm10?: number;
  carbon_monoxide?: number;
  nitrogen_dioxide?: number;
  ozone?: number;
  sulphur_dioxide?: number;
  ammonia?: number;
  dust?: number;
  aerosol_optical_depth?: number;
}

export interface McpToolResult {
  type: 'text';
  text: string;
}

export interface McpResponse {
  jsonrpc: '2.0';
  id: number;
  result?: {
    content: McpToolResult[];
  };
  error?: {
    code: number;
    message: string;
  };
}
