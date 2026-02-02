[![smithery badge](https://smithery.ai/badge/@isamauny/open_meteo_mcp)](https://smithery.ai/server/@isamauny/open_meteo_mcp)
[![PyPI - Downloads](https://img.shields.io/pypi/dm/open-meteo-mcp)](https://pypi.org/project/open-meteo-mcp/)
[![PyPI - Version](https://img.shields.io/pypi/v/open-meteo-mcp)](https://pypi.org/project/open-meteo-mcp/)
[![PyPI Downloads](https://static.pepy.tech/personalized-badge/open-meteo-mcp?period=total&units=INTERNATIONAL_SYSTEM&left_color=GRAY&right_color=GREEN&left_text=downloads)](https://pepy.tech/projects/open-meteo-mcp)
[![Docker Pulls](https://img.shields.io/docker/pulls/dog830228/mcp_weather_server)](https://hub.docker.com/r/dog830228/mcp_weather_server)

# Open Meteo MCP Server

mcp-name: io.github.isamauny/open_meteo_mcp

A Model Context Protocol (MCP) server that provides weather information using the Open-Meteo API. This server supports multiple transport modes: standard stdio, HTTP Server-Sent Events (SSE), and the new Streamable HTTP protocol for web-based integration.

## Features

### Weather & Air Quality
* Get current weather information with comprehensive metrics:
  * Temperature, humidity, dew point
  * Wind speed, direction, and gusts
  * Precipitation (rain/snow) and probability
  * Atmospheric pressure and cloud cover
  * UV index and visibility
  * "Feels like" temperature
* Get weather data for a date range with hourly details
* Get air quality information including:
  * PM2.5 and PM10 particulate matter
  * Ozone, nitrogen dioxide, carbon monoxide
  * Sulfur dioxide, ammonia, dust
  * Aerosol optical depth
  * Health advisories and recommendations

### Time & Timezone
* Get current date/time in any timezone
* Convert time between timezones
* Get timezone information

### Transport Modes
* Multiple transport modes:
  * **stdio** - Standard MCP for desktop clients (Claude Desktop, etc.)
  * **SSE** - Server-Sent Events for web applications
  * **streamable-http** - Modern MCP Streamable HTTP protocol with stateful/stateless options
* RESTful API endpoints via Starlette integration

## Installation

### Installing via Smithery

To install Open Meteo MCP Server automatically via [Smithery](https://smithery.ai/server/@isamauny/open_meteo_mcp):

```bash
npx -y @smithery/cli install @isamauny/open_meteo_mcp
```

### Standard Installation (for MCP clients like Claude Desktop)

This package can be installed using pip:

```bash
pip install open_meteo_mcp
```

### Manual Configuration for MCP Clients

This server is designed to be installed manually by adding its configuration to the `cline_mcp_settings.json` file.

1. Add the following entry to the `mcpServers` object in your `cline_mcp_settings.json` file:

```json
{
  "mcpServers": {
    "weather": {
      "command": "python",
      "args": [
        "-m",
        "open_meteo_mcp"
      ],
      "disabled": false,
      "autoApprove": []
    }
  }
}
```

2. Save the `cline_mcp_settings.json` file.

### HTTP Server Installation (for web applications)

For HTTP SSE or Streamable HTTP support, you'll need additional dependencies:

```bash
pip install open_meteo_mcp starlette uvicorn
```

## Server Modes

This MCP server supports **stdio**, **SSE**, and **streamable-http** modes in a single unified server:

### Mode Comparison

| Feature | stdio | SSE | streamable-http |
|---------|-------|-----|-----------------|
| **Use Case** | Desktop MCP clients | Web applications (legacy) | Web applications (modern) |
| **Protocol** | Standard I/O streams | Server-Sent Events | MCP Streamable HTTP |
| **Session Management** | N/A | Stateful | Stateful or Stateless |
| **Endpoints** | N/A | `/sse`, `/messages/` | `/mcp` (single) |
| **Best For** | Claude Desktop, Cline | Browser-based apps | Modern web apps, APIs |
| **State Options** | N/A | Stateful only | Stateful or Stateless |

### 1. Standard MCP Mode (Default)
The standard mode communicates via stdio and is compatible with MCP clients like Claude Desktop.

```bash
# Default mode (stdio)
python -m open_meteo_mcp

# Explicitly specify stdio mode
python -m open_meteo_mcp.server --mode stdio
```

### 2. HTTP SSE Mode (Web Applications)
The SSE mode runs an HTTP server that provides MCP functionality via Server-Sent Events, making it accessible to web applications.

```bash
# Start SSE server on default host/port (0.0.0.0:8080)
python -m open_meteo_mcp --mode sse

# Specify custom host and port
python -m open_meteo_mcp --mode sse --host localhost --port 3000

# Enable debug mode
python -m open_meteo_mcp --mode sse --debug
```

**SSE Endpoints:**
- `GET /sse` - SSE endpoint for MCP communication
- `POST /messages/` - Message endpoint for sending MCP requests

### 3. Streamable HTTP Mode (Modern MCP Protocol)
The streamable-http mode implements the new MCP Streamable HTTP protocol with a single `/mcp` endpoint. This mode supports both stateful (default) and stateless operations.

```bash
# Start streamable HTTP server on default host/port (0.0.0.0:8080)
python -m open_meteo_mcp --mode streamable-http

# Specify custom host and port
python -m open_meteo_mcp --mode streamable-http --host localhost --port 3000

# Enable stateless mode (creates fresh transport per request, no session tracking)
python -m open_meteo_mcp --mode streamable-http --stateless

# Enable debug mode
python -m open_meteo_mcp --mode streamable-http --debug
```

**Streamable HTTP Features:**
- **Stateful mode (default)**: Maintains session state across requests using session IDs
- **Stateless mode**: Creates fresh transport per request with no session tracking
- **Single endpoint**: All MCP communication happens through `/mcp`
- **Modern protocol**: Implements the latest MCP Streamable HTTP specification

**Streamable HTTP Endpoint:**
- `POST /mcp` - Single endpoint for all MCP communication (initialize, tools/list, tools/call, etc.)

**Command Line Options:**
```
--mode {stdio,sse,streamable-http}  Server mode: stdio (default), sse, or streamable-http
--host HOST                          Host to bind to (HTTP modes only, default: 0.0.0.0)
--port PORT                          Port to listen on (HTTP modes only, default: 8080)
--stateless                          Run in stateless mode (streamable-http only)
--debug                              Enable debug mode
```

**Example SSE Usage:**
```javascript
// Connect to SSE endpoint
const eventSource = new EventSource('http://localhost:8080/sse');

// Send MCP tool request
fetch('http://localhost:8080/messages/', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    type: 'tool_call',
    tool: 'get_weather',
    arguments: { city: 'Tokyo' }
  })
});
```

**Example Streamable HTTP Usage:**
```javascript
// Initialize session and call tool using Streamable HTTP protocol
async function callWeatherTool() {
  const response = await fetch('http://localhost:8080/mcp', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'tools/call',
      params: {
        name: 'get_current_weather',
        arguments: { city: 'Tokyo' }
      },
      id: 1
    })
  });

  const result = await response.json();
  console.log(result);
}
```

## Security & Authentication

### Un-secured Mode (Default)

By default, the MCP server runs **without authentication** - all endpoints are publicly accessible. This is suitable for:
- Local development and testing
- Desktop MCP clients (Claude Desktop, Cline) via stdio mode
- Internal network deployments
- Applications that handle authentication at a different layer

**Running in un-secured mode:**

```bash
# stdio mode (default - no authentication available)
python -m open_meteo_mcp

# SSE mode (no authentication)
python -m open_meteo_mcp --mode sse

# Streamable HTTP mode (no authentication)
python -m open_meteo_mcp --mode streamable-http
```

No additional configuration is required. The server will log: `"Authentication disabled - server is open"`

### Secured Mode (WSO2 IS Authentication)

For production deployments or when you need to secure your MCP server endpoints, you can enable **JWT token authentication** using WSO2 Identity Server.

**Important:** Authentication is only available in `streamable-http` mode.

#### Requirements

1. Install authentication dependencies:
   ```bash
   pip install open_meteo_mcp[auth]
   # or manually:
   pip install pyjwt cryptography
   ```

2. Set up WSO2 Identity Server (or compatible OAuth2/OIDC provider)
3. Configure environment variables (see below)

#### Configuration

Enable authentication by setting the following environment variables:

**Required:**
- `AUTH_ENABLED=true` - Enables authentication
- `WSO2_IS_URL` - Your WSO2 IS base URL (e.g., `https://your-wso2-is.com`)

**Optional:**
- `WSO2_IS_AUDIENCE` - Expected audience claim / client_id for token validation
- `WSO2_VERIFY_SSL` - Set to `false` to disable SSL verification (local dev only, default: `true`)

#### Running in Secured Mode

**Using environment variables:**

```bash
# Set environment variables
export AUTH_ENABLED=true
export WSO2_IS_URL="https://your-wso2-is.com"
export WSO2_IS_AUDIENCE="your-client-id"

# Start the server in streamable-http mode
python -m open_meteo_mcp --mode streamable-http --host 0.0.0.0 --port 8080
```

**Using Docker:**

```bash
docker run -p 8080:8080 \
  -e AUTH_ENABLED=true \
  -e WSO2_IS_URL="https://your-wso2-is.com" \
  -e WSO2_IS_AUDIENCE="your-client-id" \
  dog830228/mcp_weather_server:latest \
  --mode streamable-http
```

**For local development with self-signed certificates:**

```bash
export AUTH_ENABLED=true
export WSO2_IS_URL="https://localhost:9443"
export WSO2_VERIFY_SSL=false
export WSO2_IS_AUDIENCE="your-client-id"

python -m open_meteo_mcp --mode streamable-http --debug
```

#### Making Authenticated Requests

When authentication is enabled, all requests to the `/mcp` endpoint must include a valid JWT Bearer token:

```javascript
// Get access token from your OAuth2 provider (e.g., client credentials flow)
const accessToken = "your-jwt-access-token";

// Make authenticated request
const response = await fetch('http://localhost:8080/mcp', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${accessToken}`
  },
  body: JSON.stringify({
    jsonrpc: '2.0',
    method: 'tools/call',
    params: {
      name: 'get_current_weather',
      arguments: { city: 'Tokyo' }
    },
    id: 1
  })
});
```

**Using curl:**

```bash
# Get access token (example using client credentials)
TOKEN=$(curl -X POST "https://your-wso2-is.com/oauth2/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials" \
  -d "client_id=YOUR_CLIENT_ID" \
  -d "client_secret=YOUR_CLIENT_SECRET" \
  | jq -r '.access_token')

# Make authenticated request
curl -X POST "http://localhost:8080/mcp" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "get_current_weather",
      "arguments": {"city": "Tokyo"}
    },
    "id": 1
  }'
```

#### Authentication Response Codes

- **401 Unauthorized** - Missing, invalid, or expired token
  ```json
  {
    "error": "unauthorized",
    "message": "Missing Authorization header"
  }
  ```

- **200 OK** - Valid token, request processed successfully

#### Excluded Endpoints

The following endpoints are excluded from authentication (when configured):
- `/health` - Health check endpoint (if implemented)
- `OPTIONS` requests (CORS preflight)

### Authentication Feature Summary

| Mode | Authentication Support | Use Case |
|------|------------------------|----------|
| `stdio` | Not available | Desktop MCP clients (always un-secured) |
| `sse` | Not available | Web applications (always un-secured) |
| `streamable-http` | Optional (WSO2 IS) | Production web/API deployments |

## Configuration

This server does not require an API key for the weather data. It uses the Open-Meteo API, which is free and open-source.

## Usage

This server provides several tools for weather and time-related operations:

### Available Tools

#### Weather Tools
1. **`get_current_weather`** - Get current weather for a city with comprehensive metrics
2. **`get_weather_by_datetime_range`** - Get weather data for a date range with hourly details
3. **`get_weather_details`** - Get detailed weather information as structured JSON data

#### Air Quality Tools
4. **`get_air_quality`** - Get air quality information with pollutant levels and health advice
5. **`get_air_quality_details`** - Get detailed air quality data as structured JSON

#### Time & Timezone Tools
6. **`get_current_datetime`** - Get current time in any timezone
7. **`get_timezone_info`** - Get timezone information
8. **`convert_time`** - Convert time between timezones

### Tool Details

#### `get_current_weather`

Retrieves comprehensive current weather information for a given city with enhanced metrics.

**Parameters:**
- `city` (string, required): The name of the city (English names only)

**Returns:** Detailed weather data including:
- Temperature and "feels like" temperature
- Humidity, dew point
- Wind speed, direction (as compass direction), and gusts
- Precipitation details (rain/snow) and probability
- Atmospheric pressure and cloud cover
- UV index with warning levels
- Visibility

**Example Response:**
```
The weather in Tokyo is Mainly clear with a temperature of 22.5°C (feels like 21.0°C),
relative humidity at 65%, and dew point at 15.5°C. Wind is blowing from the NE at 12.5 km/h
with gusts up to 18.5 km/h. Atmospheric pressure is 1013.2 hPa with 25% cloud cover.
UV index is 5.5 (Moderate). Visibility is 10.0 km.
```

#### `get_weather_by_datetime_range`

Retrieves hourly weather information with comprehensive metrics for a specified city between start and end dates.

**Parameters:**
- `city` (string, required): The name of the city (English names only)
- `start_date` (string, required): Start date in format YYYY-MM-DD (ISO 8601)
- `end_date` (string, required): End date in format YYYY-MM-DD (ISO 8601)

**Returns:** Comprehensive weather analysis including:
- Hourly weather data with all enhanced metrics
- Temperature trends (highs, lows, averages)
- Precipitation patterns and probabilities
- Wind conditions assessment
- UV index trends
- Weather warnings and recommendations

**Example Response:**
```
[Analysis of weather trends over 2024-01-01 to 2024-01-07]
- Temperature ranges from 5°C to 15°C
- Precipitation expected on Jan 3rd and 5th (60% probability)
- Wind speeds averaging 15 km/h from SW direction
- UV index moderate (3-5) throughout the period
- Recommendation: Umbrella needed for midweek
```

#### `get_weather_details`

Get detailed weather information for a specified city as structured JSON data for programmatic use.

**Parameters:**
- `city` (string, required): The name of the city (English names only)

**Returns:** Raw JSON data with all weather metrics suitable for processing and analysis

#### `get_air_quality`

Get current air quality information for a specified city with pollutant levels and health advisories.

**Parameters:**
- `city` (string, required): The name of the city (English names only)
- `variables` (array, optional): Specific pollutants to retrieve. Options:
  - `pm10` - Particulate matter ≤10μm
  - `pm2_5` - Particulate matter ≤2.5μm
  - `carbon_monoxide` - CO levels
  - `nitrogen_dioxide` - NO2 levels
  - `ozone` - O3 levels
  - `sulphur_dioxide` - SO2 levels
  - `ammonia` - NH3 levels
  - `dust` - Dust particle levels
  - `aerosol_optical_depth` - Atmospheric turbidity

**Returns:** Comprehensive air quality report including:
- Current pollutant levels with units
- Air quality classification (Good/Moderate/Unhealthy/Hazardous)
- Health recommendations for general population
- Specific warnings for sensitive groups
- Comparison with WHO and EPA standards

**Example Response:**
```
Air quality in Beijing (lat: 39.90, lon: 116.41):
PM2.5: 45.3 μg/m³ (Unhealthy for Sensitive Groups)
PM10: 89.2 μg/m³ (Moderate)
Ozone (O3): 52.1 μg/m³
Nitrogen Dioxide (NO2): 38.5 μg/m³
Carbon Monoxide (CO): 420.0 μg/m³

Health Advice: Sensitive groups (children, elderly, people with respiratory conditions)
should limit outdoor activities.
```

#### `get_air_quality_details`

Get detailed air quality information as structured JSON data for programmatic analysis.

**Parameters:**
- `city` (string, required): The name of the city (English names only)
- `variables` (array, optional): Specific pollutants to retrieve (same options as `get_air_quality`)

**Returns:** Raw JSON data with complete air quality metrics and hourly data

#### `get_current_datetime`

Retrieves the current time in a specified timezone.

**Parameters:**
- `timezone_name` (string, required): IANA timezone name (e.g., 'America/New_York', 'Europe/London'). Use UTC if no timezone provided.

**Returns:** Current date and time in the specified timezone

**Example:**
```json
{
  "timezone": "America/New_York",
  "current_time": "2024-01-15T14:30:00-05:00",
  "utc_time": "2024-01-15T19:30:00Z"
}
```

#### `get_timezone_info`

Get information about a specific timezone.

**Parameters:**
- `timezone_name` (string, required): IANA timezone name

**Returns:** Timezone details including offset and DST information

#### `convert_time`

Convert time from one timezone to another.

**Parameters:**
- `time_str` (string, required): Time to convert (ISO format)
- `from_timezone` (string, required): Source timezone
- `to_timezone` (string, required): Target timezone

**Returns:** Converted time in target timezone

## MCP Client Usage Examples

### Using with Claude Desktop or MCP Clients

```xml
<use_mcp_tool>
<server_name>weather</server_name>
<tool_name>get_current_weather</tool_name>
<arguments>
{
  "city": "Tokyo"
}
</arguments>
</use_mcp_tool>
```

```xml
<use_mcp_tool>
<server_name>weather</server_name>
<tool_name>get_weather_by_datetime_range</tool_name>
<arguments>
{
  "city": "Paris",
  "start_date": "2024-01-01",
  "end_date": "2024-01-07"
}
</arguments>
</use_mcp_tool>
```

```xml
<use_mcp_tool>
<server_name>weather</server_name>
<tool_name>get_current_datetime</tool_name>
<arguments>
{
  "timezone_name": "Europe/Paris"
}
</arguments>
</use_mcp_tool>
```

```xml
<use_mcp_tool>
<server_name>weather</server_name>
<tool_name>get_air_quality</tool_name>
<arguments>
{
  "city": "Beijing"
}
</arguments>
</use_mcp_tool>
```

```xml
<use_mcp_tool>
<server_name>weather</server_name>
<tool_name>get_air_quality</tool_name>
<arguments>
{
  "city": "Los Angeles",
  "variables": ["pm2_5", "pm10", "ozone"]
}
</arguments>
</use_mcp_tool>
```

## Web Integration (SSE Mode)

When running in SSE mode, you can integrate the weather server with web applications:

### HTML/JavaScript Example

```html
<!DOCTYPE html>
<html>
<head>
    <title>Weather MCP Client</title>
</head>
<body>
    <div id="weather-data"></div>
    <script>
        // Connect to SSE endpoint
        const eventSource = new EventSource('http://localhost:8080/sse');

        eventSource.onmessage = function(event) {
            const data = JSON.parse(event.data);
            document.getElementById('weather-data').innerHTML = JSON.stringify(data, null, 2);
        };

        // Function to get weather
        async function getWeather(city) {
            const response = await fetch('http://localhost:8080/messages/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    method: 'tools/call',
                    params: {
                        name: 'get_current_weather',
                        arguments: { city: city }
                    },
                    id: 1
                })
            });
        }

        // Example: Get weather for Tokyo
        getWeather('Tokyo');

        // Example: Get air quality
        async function getAirQuality(city) {
            const response = await fetch('http://localhost:8080/messages/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    method: 'tools/call',
                    params: {
                        name: 'get_air_quality',
                        arguments: { city: city }
                    },
                    id: 2
                })
            });
        }

        getAirQuality('Beijing');
    </script>
</body>
</html>
```

## Docker Deployment

The project is available as a Docker image on Docker Hub and includes configurations for easy deployment.

### Quick Start with Docker Hub

Pull and run the latest image directly from Docker Hub:

#### Un-secured Mode (Default)

```bash
# Pull the latest image
docker pull dog830228/mcp_weather_server:latest

# Run in stdio mode (default)
docker run dog830228/mcp_weather_server:latest

# Run in SSE mode on port 8080 (un-secured)
docker run -p 8080:8080 dog830228/mcp_weather_server:latest --mode sse

# Run in streamable-http mode on port 8080 (un-secured)
docker run -p 8080:8080 dog830228/mcp_weather_server:latest --mode streamable-http

# Pull a specific version
docker pull dog830228/mcp_weather_server:0.5.0
docker run -p 8080:8080 dog830228/mcp_weather_server:0.5.0 --mode sse
```

#### Secured Mode (WSO2 IS Authentication)

```bash
# Run in streamable-http mode with WSO2 IS authentication
docker run -p 8080:8080 \
  -e AUTH_ENABLED=true \
  -e WSO2_IS_URL="https://your-wso2-is.com" \
  -e WSO2_IS_AUDIENCE="your-client-id" \
  dog830228/mcp_weather_server:latest \
  --mode streamable-http

# Run with authentication and debug logging
docker run -p 8080:8080 \
  -e AUTH_ENABLED=true \
  -e WSO2_IS_URL="https://your-wso2-is.com" \
  -e WSO2_IS_AUDIENCE="your-client-id" \
  dog830228/mcp_weather_server:latest \
  --mode streamable-http --debug

# Run with authentication in stateless mode
docker run -p 8080:8080 \
  -e AUTH_ENABLED=true \
  -e WSO2_IS_URL="https://your-wso2-is.com" \
  -e WSO2_IS_AUDIENCE="your-client-id" \
  dog830228/mcp_weather_server:latest \
  --mode streamable-http --stateless

# For local development with self-signed certificates
docker run -p 8080:8080 \
  -e AUTH_ENABLED=true \
  -e WSO2_IS_URL="https://localhost:9443" \
  -e WSO2_VERIFY_SSL=false \
  -e WSO2_IS_AUDIENCE="your-client-id" \
  dog830228/mcp_weather_server:latest \
  --mode streamable-http --debug
```

### Available Docker Images

- **Latest**: `dog830228/mcp_weather_server:latest`
- **Versioned**: `dog830228/mcp_weather_server:<version>` (e.g., `0.5.0`)

Images are automatically built and published when new versions are released.

### Building from Source

If you want to build the Docker image yourself:

#### Standard Build
```bash
# Build
docker build -t mcp-weather-server:sse .

# Run (port will be read from PORT env var, defaults to 8081)
docker run -p 8081:8081 mcp-weather-server:sse

# Run with custom port
docker run -p 8080:8080 mcp-weather-server:local --mode sse
```

#### Streamable HTTP Build
```bash
# Build using streamable-http Dockerfile
docker build -f Dockerfile.streamable-http -t mcp-weather-server:streamable-http .

# Run in stateful mode
docker run -p 8080:8080 mcp-weather-server:streamable-http

# Run in stateless mode
docker run -p 8080:8080 -e STATELESS=true mcp-weather-server:streamable-http
```

## Development

### Project Structure

```
open_meteo_mcp/
├── src/
│   └── open_meteo_mcp/
│       ├── __init__.py
│       ├── __main__.py          # Main MCP server entry point
│       ├── server.py            # Unified server (stdio, SSE, streamable-http)
│       ├── utils.py             # Utility functions
│       └── tools/               # Tool implementations
│           ├── __init__.py
│           ├── toolhandler.py   # Base tool handler
│           ├── tools_weather.py # Weather-related tools
│           ├── tools_time.py    # Time-related tools
│           ├── tools_air_quality.py # Air quality tools
│           ├── weather_service.py   # Weather API service
│           └── air_quality_service.py # Air quality API service
├── tests/
├── Dockerfile                   # Docker configuration for SSE mode
├── Dockerfile.streamable-http   # Docker configuration for streamable-http mode
├── pyproject.toml
├── requirements.txt
└── README.md
```

### Running for Development

#### Standard MCP Mode (stdio)
```bash
# From project root
python -m open_meteo_mcp

# Or with PYTHONPATH
export PYTHONPATH="/path/to/mcp_weather_server/src"
python -m open_meteo_mcp
```

#### SSE Server Mode
```bash
# From project root
python -m open_meteo_mcp --mode sse --host 0.0.0.0 --port 8080

# With custom host/port
python -m open_meteo_mcp --mode sse --host localhost --port 3000
```

#### Streamable HTTP Mode
```bash
# Stateful mode (default)
python -m open_meteo_mcp --mode streamable-http --host 0.0.0.0 --port 8080

# With debug logging
python -m open_meteo_mcp --mode streamable-http --debug
```

### Adding New Tools

To add new weather or time-related tools:

1. Create a new tool handler in the appropriate file under `tools/`
2. Inherit from the `ToolHandler` base class
3. Implement the required methods (`get_name`, `get_description`, `call`)
4. Register the tool in `server.py`

## Dependencies

### Core Dependencies
- `mcp>=1.0.0` - Model Context Protocol implementation
- `httpx>=0.28.1` - HTTP client for API requests
- `python-dateutil>=2.8.2` - Date/time parsing utilities

### SSE Server Dependencies
- `starlette` - ASGI web framework
- `uvicorn` - ASGI server

### Development Dependencies
- `pytest` - Testing framework

## API Data Sources

This server uses free and open-source APIs:

### Weather Data: [Open-Meteo Weather API](https://open-meteo.com/)
- Free and open-source
- No API key required
- Provides accurate weather forecasts
- Supports global locations
- Historical and current weather data
- Comprehensive metrics (wind, precipitation, UV, visibility)

### Air Quality Data:
- Free and open-source
- No API key required
- Real-time air quality data
- Multiple pollutant measurements (PM2.5, PM10, O3, NO2, CO, SO2)
- Global coverage
- Health-based air quality indices

## Troubleshooting

### Common Issues

**1. City not found**
- Ensure city names are in English
- Try using the full city name or include country (e.g., "Paris, France")
- Check spelling of city names

**2. HTTP Server not accessible (SSE or Streamable HTTP)**
- Verify the server is running with the correct mode:
  - SSE: `python -m open_meteo_mcp --mode sse`
  - Streamable HTTP: `python -m open_meteo_mcp --mode streamable-http`
- Check firewall settings for the specified port
- Ensure all dependencies are installed: `pip install starlette uvicorn`
- Verify the correct endpoint:
  - SSE: `http://localhost:8080/sse` and `http://localhost:8080/messages/`
  - Streamable HTTP: `http://localhost:8080/mcp`

**3. MCP Client connection issues**
- Verify Python path in MCP client configuration
- Check that `open_meteo_mcp` package is installed
- Ensure Python environment has required dependencies

**4. Date format errors**
- Use ISO 8601 format for dates: YYYY-MM-DD
- Ensure start_date is before end_date
- Check that dates are not too far in the future

**5. Authentication errors (Secured Mode)**
- **401 Unauthorized - Missing Authorization header**
  - Ensure you're including the `Authorization: Bearer <token>` header in your requests
  - Verify the token is properly formatted (no extra spaces)

- **401 Unauthorized - Token validation failed**
  - Check that your JWT token is not expired
  - Verify the token was issued by the correct WSO2 IS instance (check `iss` claim)
  - Ensure the audience claim matches your `WSO2_IS_AUDIENCE` configuration
  - Verify the token signature is valid

- **Failed to import auth module**
  - Install authentication dependencies: `pip install open_meteo_mcp[auth]`
  - Or manually: `pip install pyjwt cryptography`

- **WSO2_IS_URL environment variable is required**
  - Set `WSO2_IS_URL` when `AUTH_ENABLED=true`
  - Example: `export WSO2_IS_URL="https://your-wso2-is.com"`

- **SSL certificate verification errors**
  - For production: Use valid SSL certificates
  - For local development only: Set `WSO2_VERIFY_SSL=false`
  - Never disable SSL verification in production

### Error Responses

The server returns structured error messages:

**Weather/API errors:**
```json
{
  "error": "Could not retrieve coordinates for InvalidCity."
}
```

**Authentication errors (Secured Mode):**
```json
{
  "error": "unauthorized",
  "message": "Missing Authorization header"
}
```


<!-- Need to add this line for MCP registry publication -->
<!-- mcp-name: io.github.isamauny/open_meteo_mcp -->
