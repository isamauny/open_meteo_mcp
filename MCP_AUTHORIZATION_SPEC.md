# MCP Authorization Specification Implementation

This document describes the implementation of OAuth 2.0 Bearer token authorization per the MCP specification.

## Table of Contents

- [Specification Reference](#specification-reference)
- [Overview](#overview)
  - [Key Features](#key-features)
  - [MCP Streamable HTTP Considerations](#mcp-streamable-http-considerations)
- [Server Implementation](#server-implementation)
  - [Architecture](#architecture)
  - [Components](#components)
- [Client Implementation](#client-implementation)
  - [Architecture](#architecture-1)
  - [Components](#components-1)
- [Example Flow](#example-flow)
  - [Scenario: User Tries to Access Air Quality Without Required Scope](#scenario-user-tries-to-access-air-quality-without-required-scope)
- [Configuration](#configuration)
  - [Server Configuration](#server-configuration)
  - [Asgardeo Configuration](#asgardeo-configuration)
  - [Client Configuration](#client-configuration)
- [Testing](#testing)
  - [Test Scope Authorization](#test-scope-authorization)
  - [Test Without Authentication](#test-without-authentication)
- [Benefits](#benefits)
  - [For Users](#for-users)
  - [For Administrators](#for-administrators)
  - [For Developers](#for-developers)
- [Scope Best Practices](#scope-best-practices)
  - [Naming Conventions](#naming-conventions)
  - [Granularity](#granularity)
  - [Tool Mapping](#tool-mapping)
- [Troubleshooting](#troubleshooting)
  - [Server doesn't return scope error information](#server-doesnt-return-scope-error-information)
  - [Client doesn't show scope card](#client-doesnt-show-scope-card)
  - [Scope check always fails](#scope-check-always-fails)
- [References](#references)

## Specification Reference

**MCP Authorization Specification:**
https://modelcontextprotocol.io/specification/2025-11-25/basic/authorization

## Overview

The Open Meteo MCP Server now implements proper OAuth 2.0 scope-based authorization with informative error responses that tell clients exactly what permissions they need.

### Key Features

1. **Scope-Based Authorization**: Tools can require specific OAuth2 scopes
2. **Tool Scope Metadata**: Tools declare required scopes in `inputSchema` using `x-required-scopes`
3. **MCP Protocol Error Responses**: Scope errors are returned in MCP response body as structured JSON
4. **WWW-Authenticate Header Info**: Logged and included in response for spec compliance
5. **Informative Error Responses**: Clients receive detailed information about missing scopes
6. **Proactive Access Display**: `ToolsAccessCard` shows which tools users can access before they try to use them
7. **Reactive Error Display**: `ScopeRequiredCard` shows clear error messages when scope is insufficient
8. **User-Friendly UI**: React client displays scope requirements in an actionable format

### MCP Streamable HTTP Considerations

The MCP Streamable HTTP protocol establishes an HTTP 200 OK connection **before** tool execution, then streams MCP protocol messages over that connection. This has important implications for error handling:

**Two-Phase Error Handling:**

1. **Authentication Phase (Middleware)**:
   - Happens **before** MCP session establishment
   - Missing/invalid tokens → Traditional HTTP 401 Unauthorized
   - Can send WWW-Authenticate as HTTP header
   - Example: `WWW-Authenticate: Bearer error="invalid_token"`

2. **Authorization Phase (Tool Execution)**:
   - Happens **after** HTTP 200 connection established
   - Insufficient scopes → MCP error response in JSON body
   - Cannot send HTTP 401 (connection already open)
   - WWW-Authenticate value included in JSON for spec compliance
   - Example: `{"error": "insufficient_scope", "www_authenticate": "Bearer scope=\"read_airquality\""}`

**Why this matters:**
- Clients must handle errors differently depending on when they occur
- Server logs WWW-Authenticate value for demo/debugging purposes
- Both approaches comply with OAuth 2.0 spec, adapted for streaming protocols

## Server Implementation

### Architecture

```
Request → Middleware → MCP Session → Tool Handler
            ↓                            ↓
        Token Check                  Scope Check
            ↓                            ↓
        401 Unauthorized            ScopeRequiredError
                                         ↓
                                  JSON error in MCP response
                                  (includes WWW-Authenticate value)
                                         ↓
                                  Client parses & displays
```

### Components

#### 1. Exception Classes (`auth/exceptions.py`)

**`ScopeRequiredError`**: Custom exception for missing scopes

```python
raise ScopeRequiredError(
    required_scopes=["read_airquality"],
    available_scopes=["openid", "profile"],
    resource_metadata_url="https://example.com/.well-known/oauth-protected-resource"
)
```

**In middleware context** (before streaming starts), this would generate:
```http
HTTP/1.1 401 Unauthorized
WWW-Authenticate: Bearer resource_metadata="https://example.com/.well-known/oauth-protected-resource",
                         scope="read_airquality"
Content-Type: application/json

{
  "error": "insufficient_scope",
  "message": "Required scope: read_airquality",
  "required_scopes": ["read_airquality"],
  "available_scopes": ["openid", "profile"]
}
```

**In tool execution context** (after streaming starts), the WWW-Authenticate value is included in the JSON response body:
```json
{
  "result": {
    "content": [{
      "type": "text",
      "text": "{\"error\":\"insufficient_scope\",\"message\":\"Required scope: read_airquality\",\"required_scopes\":[\"read_airquality\"],\"available_scopes\":[\"openid\",\"profile\"],\"www_authenticate\":\"Bearer scope=\\\"read_airquality\\\"\"}"
    }]
  }
}
```

#### 2. MCP Server Tool Handler (`server.py`)

When a tool execution fails with `ScopeRequiredError`, the server:
- Generates the WWW-Authenticate header value
- Logs it for visibility (useful for demos/debugging)
- Returns structured JSON error response in MCP format

```python
if SCOPE_ERROR_CLASS and isinstance(e, SCOPE_ERROR_CLASS):
    # Generate WWW-Authenticate header (for demo/logging purposes)
    www_authenticate = e.get_www_authenticate_header()
    logger.info(f"WWW-Authenticate: {www_authenticate}")

    # Return scope error as structured JSON
    error_response = {
        "error": "insufficient_scope",
        "message": e.message,
        "required_scopes": e.required_scopes,
        "available_scopes": e.available_scopes,
        "status_code": 401,
        "www_authenticate": www_authenticate
    }
    return [TextContent(type="text", text=json.dumps(error_response))]
```

#### 3. Scope Validation (`auth/request_context.py`)

Updated scope checking functions:

```python
from open_meteo_mcp.auth import require_scope

# In your tool handler:
def run_tool(self, args: dict):
    require_scope("read_airquality")
    # Tool implementation...
```

The function now raises `ScopeRequiredError` instead of generic `PermissionError`.

#### 4. Tool Handlers with Scope Metadata

Air quality tools demonstrate scope-based authorization with both **metadata declaration** and **runtime validation**:

```python
from ..auth import require_scope

AIRQUALITY_SCOPE = "read_airquality"

class GetAirQualityToolHandler(ToolHandler):
    def __init__(self):
        super().__init__(
            name="get_air_quality",
            description="""Get air quality information for a city.

            **Required OAuth2 Scope**: read_airquality""",
            inputSchema={
                "type": "object",
                "properties": {
                    "city": {
                        "type": "string",
                        "description": "City name to get air quality for"
                    }
                },
                "required": ["city"],
                "x-required-scopes": ["read_airquality"]  # Scope metadata for client discovery
            }
        )

    async def run_tool(self, args: dict):
        # Runtime scope validation
        require_scope(AIRQUALITY_SCOPE)

        # Tool implementation...
        city = args.get("city")
        # Fetch air quality data...
```

**Key implementation details:**

1. **`x-required-scopes` in `inputSchema`**: Custom JSON Schema extension that declares which scopes are needed. Clients can fetch this metadata via `tools/list` to proactively display tool access.

2. **`require_scope()` at runtime**: Server-side validation that raises `ScopeRequiredError` if the user lacks required permissions.

3. **Description includes scope info**: Human-readable documentation helps developers understand requirements.

**Why both metadata and runtime checks?**
- **Metadata (`x-required-scopes`)**: Enables proactive UI (ToolsAccessCard) - users see what they can access upfront
- **Runtime check (`require_scope()`)**: Security enforcement - prevents bypassing client-side checks

## Client Implementation

### Architecture

```
User Action → MCP Client → Server
                ↓
          Parse Response
                ↓
        ScopeRequiredError?
          ↓           ↓
        Yes          No
          ↓           ↓
   Display Scope    Display
   Required Card    Error/Data
```

### Components

#### 1. Error Types (`types/errors.ts`)

**`ScopeRequiredError`**: Custom TypeScript error class

```typescript
export class ScopeRequiredError extends Error {
  public readonly requiredScopes: string[];
  public readonly availableScopes: string[];
  public readonly resourceMetadataUrl?: string;
  public readonly statusCode: number = 401;
}
```

**`parseScopeError()`**: Parse 401 responses

```typescript
export async function parseScopeError(
  response: Response,
  responseBody?: any
): Promise<ScopeRequiredError | null>
```

#### 2. MCP Client (`services/mcpClient.ts`)

Enhanced MCP response parsing to detect scope errors:

```typescript
const resultText = data.result.content[0].text;

// Check if the result is a scope error JSON
try {
  const parsed = JSON.parse(resultText);
  if (parsed.error === 'insufficient_scope' && parsed.required_scopes) {
    // Create and throw ScopeRequiredError
    throw new ScopeRequiredError(
      parsed.message,
      parsed.required_scopes,
      parsed.available_scopes || [],
      parsed.resource_metadata_url
    );
  }
} catch (e) {
  if (e.name === 'ScopeRequiredError') throw e;
  // Not a JSON error, continue with normal text response
}
```

#### 3. Scope Required Card (`components/ScopeRequiredCard.tsx`)

User-friendly display of scope requirements:

```typescript
<ScopeRequiredCard
  requiredScopes={["read_airquality"]}
  availableScopes={["openid", "profile"]}
  message="This resource requires additional OAuth2 scopes"
  resourceMetadataUrl="https://..."
/>
```

**Features:**
- Lists required scopes
- Shows which scopes are missing (red) vs. granted (green)
- Displays current scopes
- Provides actionable steps
- Links to resource metadata

#### 4. Component Integration

`AirQualityCard.tsx` checks for scope errors:

```typescript
if (error) {
  if (ScopeRequiredError.isScopeRequiredError(error)) {
    return <ScopeRequiredCard {...error} />;
  }
  // Handle other errors...
}
```

#### 5. Tools Access Card (`components/ToolsAccessCard.tsx`)

**Proactive tool access display** - shows users which tools they can use before they try to invoke them.

```typescript
export function ToolsAccessCard({ serverUrl = '/mcp' }: ToolsAccessCardProps) {
  const auth = useAuth();
  const [tools, setTools] = useState<ToolInfo[]>([]);

  useEffect(() => {
    const fetchTools = async () => {
      // 1. Initialize MCP session
      const initResponse = await fetch(serverUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${auth.user.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'initialize',
          params: {
            protocolVersion: '2024-11-05',
            capabilities: {},
            clientInfo: { name: 'weather-client-tools', version: '1.0.0' }
          },
          id: 1
        })
      });

      const sessionId = initResponse.headers.get('mcp-session-id');

      // 2. Fetch tools list
      const response = await fetch(serverUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${auth.user.access_token}`,
          'mcp-session-id': sessionId,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'tools/list',
          id: 2
        })
      });

      const data = await response.json();

      // 3. Parse scope requirements and check user access
      const userScopes = auth.user.profile.scope?.split(' ') || [];
      const toolsList = data.result.tools.map((tool: any) => {
        const requiredScopes = tool.inputSchema?.['x-required-scopes'] || [];
        const hasAccess = requiredScopes.length === 0 ||
                         requiredScopes.every((scope: string) => userScopes.includes(scope));

        return {
          name: tool.name,
          description: tool.description.split('\n')[0],
          requiredScopes,
          hasAccess
        };
      });

      setTools(toolsList);
    };

    fetchTools();
  }, [auth.user, serverUrl]);

  // Render available tools (green) and restricted tools (red)
}
```

**Key features:**

- **Initializes own MCP session**: Makes independent `initialize` + `tools/list` calls to fetch tool metadata
- **Parses `x-required-scopes`**: Extracts scope requirements from each tool's `inputSchema`
- **Compares with user scopes**: Checks if user has all required scopes for each tool
- **Color-coded display**:
  - Green ✓ for tools user can access
  - Red 🔒 for tools requiring additional scopes
- **Collapsible**: Users can hide the tools list to reduce clutter
- **Summary in header**: Shows "X of Y accessible" at a glance

**UI example:**

```
┌─────────────────────────────────────────────┐
│ 🔧 Available Tools (2 of 4 accessible)  ▼  │
├─────────────────────────────────────────────┤
│ ✓ Tools You Can Use (2)                     │
│  ┌─────────────────────────────────────┐   │
│  │ get_current_weather                  │   │
│  │ Get current weather for a city       │   │
│  └─────────────────────────────────────┘   │
│  ┌─────────────────────────────────────┐   │
│  │ get_weather_details                  │   │
│  │ Get detailed weather information     │   │
│  └─────────────────────────────────────┘   │
│                                              │
│ 🔒 Restricted Tools (2)                     │
│  ┌─────────────────────────────────────┐   │
│  │ get_air_quality                      │   │
│  │ Get air quality information          │   │
│  │ Required: read_airquality            │   │
│  └─────────────────────────────────────┘   │
│  ┌─────────────────────────────────────┐   │
│  │ get_air_quality_details              │   │
│  │ Get detailed air quality metrics     │   │
│  │ Required: read_airquality            │   │
│  └─────────────────────────────────────┘   │
│                                              │
│ 2 of 4 tools available with your scopes     │
└─────────────────────────────────────────────┘
```

**Integration:**

Add to dashboard in `WeatherDashboard.tsx`:

```typescript
export function WeatherDashboard() {
  return (
    <div className="space-y-6">
      <ToolsAccessCard />  {/* Shows available tools */}

      <WeatherSearch onSearch={handleSearch} />
      <WeatherCard />
      <AirQualityCard />  {/* Shows ScopeRequiredCard on error */}
    </div>
  );
}
```

This provides a complete authorization experience:
1. **Proactive** (ToolsAccessCard): "Here's what you can do"
2. **Reactive** (ScopeRequiredCard): "Here's why you can't and what to do about it"

## Example Flow

### Scenario: User Tries to Access Air Quality Without Required Scope

1. **User action**: Click "Get Air Quality" for Tokyo

2. **Client establishes MCP connection**:
   ```http
   POST /mcp HTTP/1.1
   Authorization: Bearer eyJhbGc...

   {"method": "initialize", ...}
   ```
   Response: `HTTP/1.1 200 OK` (connection established)

3. **Client calls tool**:
   ```json
   {
     "method": "tools/call",
     "params": {
       "name": "get_air_quality",
       "arguments": {"city": "Tokyo"}
     }
   }
   ```

4. **Server validates token**: ✅ Valid token with scopes: `openid, profile`

5. **Tool checks scope**: `require_scope("read_airquality")` → ❌ Missing

6. **Server logs** (for demo):
   ```
   WARNING:mcp-weather.auth:User f187f398... missing required scope 'read_airquality'. Available scopes: ['openid']
   INFO:mcp-weather:WWW-Authenticate: Bearer scope="read_airquality"
   ```

7. **Server returns MCP error**:
   ```json
   {
     "result": {
       "content": [{
         "type": "text",
         "text": "{
           \"error\": \"insufficient_scope\",
           \"message\": \"Required scope: read_airquality\",
           \"required_scopes\": [\"read_airquality\"],
           \"available_scopes\": [\"openid\", \"profile\"],
           \"status_code\": 401,
           \"www_authenticate\": \"Bearer scope=\\\"read_airquality\\\"\"
         }"
       }]
     }
   }
   ```

8. **Client parses JSON**: Creates `ScopeRequiredError`

9. **UI displays**:
   ```
   ┌──────────────────────────────────────┐
   │ 🛡️  Additional Permission Required   │
   │                                      │
   │ Required Scopes:                     │
   │  🔴 read_airquality (missing)        │
   │                                      │
   │ Your Current Scopes:                 │
   │  openid  profile                     │
   │                                      │
   │ What to do:                          │
   │  1. Sign out                         │
   │  2. Contact admin to request scope   │
   │  3. Sign in again                    │
   └──────────────────────────────────────┘
   ```

## Configuration

### Server Configuration

Enable authentication and set resource metadata URL:

```python
# In server.py
middleware = create_auth_middleware(
    issuer_url=WSO2_IS_URL,
    audience=WSO2_IS_AUDIENCE,
    resource_metadata_url="https://mcp.example.com/.well-known/oauth-protected-resource"
)
```

### Asgardeo Configuration

1. Create scopes in Asgardeo Console
2. Add scopes to your application:
   - `openid` (required)
   - `read_airquality` (for air quality tools)
   - Other custom scopes as needed
3. Users must request these scopes during login

### Client Configuration

No additional configuration needed - the client automatically:
- Parses scope error JSON responses (including WWW-Authenticate info)
- Displays scope requirements with ToolsAccessCard (proactive)
- Shows ScopeRequiredCard on errors (reactive)
- Provides actionable steps for users

## Testing

### Test Scope Authorization

1. **Remove scope from token**:
   - In Asgardeo, remove `read_airquality` from your app scopes
   - Sign out and sign in again

2. **Try to access air quality data**:
   - Search for a city
   - Air quality card will show scope required message

3. **Verify MCP response** (during tool execution):
   ```bash
   curl -X POST http://localhost:8080/mcp \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "jsonrpc": "2.0",
       "method": "tools/call",
       "params": {
         "name": "get_air_quality",
         "arguments": {"city": "Tokyo"}
       },
       "id": 1
     }'
   ```

   Response body will contain scope error as JSON:
   ```json
   {
     "result": {
       "content": [{
         "type": "text",
         "text": "{\"error\":\"insufficient_scope\",\"message\":\"Required scope: read_airquality\",\"required_scopes\":[\"read_airquality\"],\"www_authenticate\":\"Bearer scope=\\\"read_airquality\\\"\"}"
       }]
     }
   }
   ```

   **Note**: Due to MCP Streamable HTTP, the HTTP status is 200 OK but the MCP response contains the error. The `www_authenticate` field is included in the JSON for spec compliance.

### Test Without Authentication

```bash
curl -X POST http://localhost:8080/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc": "2.0", "method": "initialize", "id": 1}' \
  -v
```

Should see (authentication happens in middleware before MCP streaming starts):
```
< HTTP/1.1 401 Unauthorized
< WWW-Authenticate: Bearer error="invalid_token"

{"error": "unauthorized", "message": "Missing Authorization header"}
```

**Important distinction:**
- **Authentication errors** (missing/invalid token) happen in middleware → HTTP 401 with WWW-Authenticate header
- **Authorization errors** (insufficient scope) happen during tool execution → HTTP 200 with error in JSON body

## Benefits

### For Users
- **Clear Error Messages**: Know exactly what permissions are needed
- **Actionable Steps**: Instructions on how to request access
- **Visual Feedback**: Color-coded scope status

### For Administrators
- **Fine-Grained Control**: Assign specific permissions per user
- **Standards Compliant**: Implements OAuth 2.0 and MCP specs
- **Audit Trail**: Server logs scope violations

### For Developers
- **Easy to Implement**: Simple decorator pattern for tools
- **Type Safe**: TypeScript error classes with full typing
- **Extensible**: Add new scopes without changing infrastructure

## Scope Best Practices

### Naming Conventions

Use descriptive, action-oriented scope names:
- ✅ `read_airquality`
- ✅ `write_weather_alerts`
- ✅ `manage_locations`
- ❌ `airquality` (too vague)
- ❌ `admin` (too broad)

### Granularity

Balance between too many and too few scopes:
- **Too Fine**: `read_pm25`, `read_pm10`, `read_ozone` (annoying for users)
- **Just Right**: `read_airquality` (covers all pollutants)
- **Too Coarse**: `read_all` (defeats purpose of scopes)

### Tool Mapping

| Tool | Required Scope |
|------|----------------|
| `get_current_weather` | None (public) |
| `get_weather_details` | None (public) |
| `get_air_quality` | `read_airquality` |
| `get_air_quality_details` | `read_airquality` |
| Future: `set_alert` | `write_weather_alerts` |

## Troubleshooting

### Server doesn't return scope error information

**Symptom**: Scope errors aren't being caught or returned properly

**Solutions**:
- Check that you're raising `ScopeRequiredError` not `PermissionError`
- Verify tool handlers re-raise `ScopeRequiredError` (don't catch it in generic exception handlers)
- Check server logs for "WWW-Authenticate: Bearer scope=..." log message
- Verify the error response includes `www_authenticate` field in JSON
- Ensure middleware is configured with `create_auth_middleware()`

**Remember**: Due to MCP Streamable HTTP:
- Authentication errors (middleware) → HTTP 401 header
- Authorization errors (tool execution) → JSON body with `www_authenticate` field

### Client doesn't show scope card

- Verify `parseScopeError()` is called in `mcpClient.ts`
- Check browser console for error parsing issues
- Ensure `ScopeRequiredCard` is imported in error-displaying components

### Scope check always fails

- Verify token includes the required scope (decode JWT at jwt.io)
- Check scope claim format (space-separated string vs array)
- Ensure WSO2/Asgardeo includes scope in token

## References

- [MCP Authorization Specification](https://modelcontextprotocol.io/specification/2025-11-25/basic/authorization)
- [RFC 6750 - OAuth 2.0 Bearer Token Usage](https://www.rfc-editor.org/rfc/rfc6750)
- [RFC 6749 - OAuth 2.0 Framework](https://www.rfc-editor.org/rfc/rfc6749)
- [WSO2 Asgardeo Scopes Documentation](https://wso2.com/asgardeo/docs/guides/authentication/oidc/configure-scopes/)
