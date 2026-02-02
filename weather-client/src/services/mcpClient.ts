import { mcpConfig } from '../config/auth';
import type { McpResponse } from '../types/weather';
import { parseScopeError } from '../types/errors';

/**
 * MCP Client for communicating with the Weather MCP Server.
 *
 * This client implements the MCP Streamable HTTP protocol to call
 * weather-related tools on the server. Handles both JSON and SSE responses.
 */

let requestId = 0;
let sessionId: string | null = null;

/**
 * Generate a unique request ID
 */
function getNextRequestId(): number {
  return ++requestId;
}

/**
 * Get the MCP server URL.
 * In development, requests to /mcp are proxied by Vite.
 */
function getMcpUrl(): string {
  // In development, use the proxy path
  if (import.meta.env.DEV) {
    return '/mcp';
  }
  // In production, use the full URL
  return `${mcpConfig.serverUrl}${mcpConfig.endpoint}`;
}

/**
 * Parse SSE response and extract JSON messages
 */
async function parseSSEResponse(response: Response): Promise<McpResponse> {
  const text = await response.text();

  // Check if it's SSE format (starts with "event:" or "data:")
  if (text.startsWith('event:') || text.startsWith('data:')) {
    // Parse SSE events
    const lines = text.split('\n');
    let lastData: string | null = null;

    for (const line of lines) {
      if (line.startsWith('data:')) {
        lastData = line.substring(5).trim();
      }
    }

    if (lastData) {
      try {
        return JSON.parse(lastData);
      } catch (e) {
        console.error('Failed to parse SSE data:', lastData);
        throw new Error(`Failed to parse SSE response: ${e}`);
      }
    }

    throw new Error('No data found in SSE response');
  }

  // Try to parse as regular JSON
  try {
    return JSON.parse(text);
  } catch (e) {
    console.error('Failed to parse response:', text.substring(0, 200));
    throw new Error(`Failed to parse response: ${e}`);
  }
}

/**
 * Initialize the MCP session.
 * This must be called before making tool calls.
 */
export async function initializeSession(accessToken?: string): Promise<void> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json, text/event-stream',
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const response = await fetch(getMcpUrl(), {
    method: 'POST',
    headers,
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: {
          name: 'weather-client',
          version: '1.0.0',
        },
      },
      id: getNextRequestId(),
    }),
  });

  // Store session ID from response headers
  const newSessionId = response.headers.get('mcp-session-id');
  if (newSessionId) {
    sessionId = newSessionId;
  }

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to initialize MCP session: ${response.status} ${error}`);
  }

  // Send initialized notification
  await fetch(getMcpUrl(), {
    method: 'POST',
    headers: {
      ...headers,
      ...(sessionId ? { 'mcp-session-id': sessionId } : {}),
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'notifications/initialized',
    }),
  });
}

/**
 * Call an MCP tool on the weather server.
 *
 * @param toolName - Name of the tool to call
 * @param args - Arguments to pass to the tool
 * @param accessToken - Optional OAuth2 access token for authentication
 * @returns The tool result as a string
 */
export async function callMcpTool(
  toolName: string,
  args: Record<string, unknown>,
  accessToken?: string
): Promise<string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json, text/event-stream',
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  if (sessionId) {
    headers['mcp-session-id'] = sessionId;
  }

  const response = await fetch(getMcpUrl(), {
    method: 'POST',
    headers,
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'tools/call',
      params: {
        name: toolName,
        arguments: args,
      },
      id: getNextRequestId(),
    }),
  });

  // Update session ID if provided
  const newSessionId = response.headers.get('mcp-session-id');
  if (newSessionId) {
    sessionId = newSessionId;
  }

  if (!response.ok) {
    // For 401 errors, check if it's a scope error per MCP specification
    if (response.status === 401) {
      try {
        const errorBody = await response.json();
        const scopeError = await parseScopeError(response, errorBody);
        if (scopeError) {
          // This is a scope error - throw it for special handling
          throw scopeError;
        }
        // Generic 401 error
        throw new Error(errorBody.message || 'Authentication required. Please sign in.');
      } catch (e) {
        // If it's already a ScopeRequiredError, re-throw it
        if (e instanceof Error && e.name === 'ScopeRequiredError') {
          throw e;
        }
        // Failed to parse error body
        throw new Error('Authentication required. Please sign in.');
      }
    }

    // Other error status codes
    const error = await response.text();
    throw new Error(`MCP call failed: ${response.status} ${error}`);
  }

  // Parse response (handles both JSON and SSE formats)
  const data = await parseSSEResponse(response);

  if (data.error) {
    throw new Error(data.error.message);
  }

  if (!data.result?.content?.[0]) {
    throw new Error('Empty response from MCP server');
  }

  const resultText = data.result.content[0].text;

  // Check if the result is a scope error JSON (MCP returns 200 OK with error in body)
  try {
    const parsed = JSON.parse(resultText);
    if (parsed.error === 'insufficient_scope' && parsed.required_scopes) {
      // This is a scope error - create and throw ScopeRequiredError
      const { ScopeRequiredError } = await import('../types/errors');
      throw new ScopeRequiredError(
        parsed.message || 'Insufficient scope',
        parsed.required_scopes,
        parsed.available_scopes || [],
        parsed.resource_metadata_url
      );
    }
  } catch (e) {
    // If it's already a ScopeRequiredError, re-throw it
    if (e instanceof Error && e.name === 'ScopeRequiredError') {
      throw e;
    }
    // If JSON.parse failed, it's normal text response, continue
  }

  return resultText;
}

/**
 * Get current weather for a city.
 */
export async function getCurrentWeather(city: string, accessToken?: string): Promise<string> {
  return callMcpTool('get_current_weather', { city }, accessToken);
}

/**
 * Get detailed weather data as JSON.
 */
export async function getWeatherDetails(
  city: string,
  includeForecast: boolean = false,
  accessToken?: string
): Promise<string> {
  return callMcpTool(
    'get_weather_details',
    { city, include_forecast: includeForecast },
    accessToken
  );
}

/**
 * Get weather for a date range.
 */
export async function getWeatherByDateRange(
  city: string,
  startDate: string,
  endDate: string,
  accessToken?: string
): Promise<string> {
  return callMcpTool(
    'get_weather_byDateTimeRange',
    { city, start_date: startDate, end_date: endDate },
    accessToken
  );
}

/**
 * Get air quality for a city.
 */
export async function getAirQuality(
  city: string,
  variables?: string[],
  accessToken?: string
): Promise<string> {
  const args: Record<string, unknown> = { city };
  if (variables) {
    args.variables = variables;
  }
  return callMcpTool('get_air_quality', args, accessToken);
}

/**
 * Get detailed air quality data as JSON.
 */
export async function getAirQualityDetails(
  city: string,
  variables?: string[],
  accessToken?: string
): Promise<string> {
  const args: Record<string, unknown> = { city };
  if (variables) {
    args.variables = variables;
  }
  return callMcpTool('get_air_quality_details', args, accessToken);
}

/**
 * Get current date/time in a timezone.
 */
export async function getCurrentDateTime(
  timezone: string,
  accessToken?: string
): Promise<string> {
  return callMcpTool('get_current_datetime', { timezone_name: timezone }, accessToken);
}

/**
 * Get timezone information.
 */
export async function getTimezoneInfo(
  timezone: string,
  accessToken?: string
): Promise<string> {
  return callMcpTool('get_timezone_info', { timezone_name: timezone }, accessToken);
}

/**
 * Convert time between timezones.
 */
export async function convertTime(
  datetime: string,
  fromTimezone: string,
  toTimezone: string,
  accessToken?: string
): Promise<string> {
  return callMcpTool(
    'convert_time',
    {
      datetime_str: datetime,
      from_timezone: fromTimezone,
      to_timezone: toTimezone,
    },
    accessToken
  );
}
