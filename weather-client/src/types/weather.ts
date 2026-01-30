/**
 * Weather data types for the MCP client
 */

export interface WeatherData {
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  timezone: string;
  current: CurrentWeather;
  forecast?: HourlyForecast[];
}

export interface CurrentWeather {
  time: string;
  temperature: number;
  feels_like: number;
  humidity: number;
  dew_point: number;
  wind_speed: number;
  wind_direction: number;
  wind_gusts: number;
  precipitation: number;
  pressure: number;
  cloud_cover: number;
  uv_index: number;
  visibility: number;
  weather_code: number;
  weather_description: string;
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
  timezone: string;
  current: CurrentAirQuality;
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
