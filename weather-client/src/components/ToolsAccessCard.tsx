import { useEffect, useState } from 'react';
import { useAuth } from 'react-oidc-context';

interface ToolInfo {
  name: string;
  description: string;
  requiredScopes: string[];
  hasAccess: boolean;
}

interface ToolsAccessCardProps {
  serverUrl?: string;
}

export function ToolsAccessCard({ serverUrl = '/mcp' }: ToolsAccessCardProps) {
  const auth = useAuth();
  const [tools, setTools] = useState<ToolInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);
  const [showRestricted, setShowRestricted] = useState(false);

  useEffect(() => {
    const fetchTools = async () => {
      if (!auth.isAuthenticated || !auth.user) {
        setLoading(false);
        return;
      }

      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/event-stream',
          'Authorization': `Bearer ${auth.user.access_token}`,
        };

        // First, initialize the MCP session
        const initResponse = await fetch(serverUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'initialize',
            params: {
              protocolVersion: '2024-11-05',
              capabilities: {},
              clientInfo: {
                name: 'weather-client-tools',
                version: '1.0.0',
              },
            },
            id: 1,
          }),
        });

        if (!initResponse.ok) {
          throw new Error(`Failed to initialize MCP session: ${initResponse.status}`);
        }

        // Get session ID
        const sessionId = initResponse.headers.get('mcp-session-id');
        if (sessionId) {
          headers['mcp-session-id'] = sessionId;
        }

        // Now fetch tools list
        const response = await fetch(serverUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'tools/list',
            id: 2,
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch tools: ${response.status}`);
        }

        const text = await response.text();
        let data;

        // Parse SSE or JSON response
        if (text.startsWith('event:') || text.startsWith('data:')) {
          const lines = text.split('\n');
          let lastData: string | null = null;
          for (const line of lines) {
            if (line.startsWith('data:')) {
              lastData = line.substring(5).trim();
            }
          }
          if (lastData) {
            data = JSON.parse(lastData);
          } else {
            throw new Error('No data in SSE response');
          }
        } else {
          data = JSON.parse(text);
        }

        // Parse tools and check scope access
        // Decode JWT access token to get scope claim
        const decodeJWT = (token: string) => {
          try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(
              atob(base64)
                .split('')
                .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join('')
            );
            return JSON.parse(jsonPayload);
          } catch (e) {
            console.error('Failed to decode JWT:', e);
            return {};
          }
        };

        const tokenClaims = decodeJWT(auth.user.access_token);
        const scopeString = tokenClaims.scope || auth.user.profile.scope || '';
        const userScopes = typeof scopeString === 'string' ? scopeString.split(' ') : [];

        const toolsList: ToolInfo[] = data.result.tools.map((tool: any) => {
          const requiredScopes = tool.inputSchema?.['x-required-scopes'] || [];
          const hasAccess = requiredScopes.length === 0 ||
                           requiredScopes.every((scope: string) => userScopes.includes(scope));

          return {
            name: tool.name,
            description: tool.description.split('\n')[0], // First line only
            requiredScopes,
            hasAccess,
          };
        });

        setTools(toolsList);
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch tools');
        setLoading(false);
      }
    };

    fetchTools();
  }, [auth.isAuthenticated, auth.user, serverUrl]);

  if (!auth.isAuthenticated) {
    return null;
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
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
        <h3 className="text-lg font-semibold text-red-700 mb-2">Tools Access Error</h3>
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  const availableTools = tools.filter(t => t.hasAccess);
  const restrictedTools = tools.filter(t => !t.hasAccess);

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-6 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">🔧</span>
          <h3 className="text-xl font-bold text-gray-800">Available Tools</h3>
          <span className="text-sm text-gray-600">
            ({availableTools.length} tool{availableTools.length !== 1 ? 's' : ''})
          </span>
        </div>
        <span className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
          ▼
        </span>
      </button>

      {isExpanded && (
        <div className="px-6 pb-6">
          {/* Available Tools */}
          {availableTools.length > 0 ? (
            <div className="space-y-2">
              {availableTools.map((tool) => (
                <div
                  key={tool.name}
                  className="p-3 bg-green-50 border border-green-200 rounded-lg"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-green-500 text-sm">✓</span>
                        <span className="font-mono text-sm font-medium text-green-900">
                          {tool.name}
                        </span>
                      </div>
                      <p className="text-xs text-green-700 mt-1 ml-6">{tool.description}</p>
                    </div>
                    {tool.requiredScopes.length > 0 && (
                      <div className="ml-2">
                        <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded">
                          {tool.requiredScopes.join(', ')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p className="text-sm">No tools available with your current permissions.</p>
              <p className="text-xs mt-1">Contact your administrator to request access.</p>
            </div>
          )}

          {/* Restricted Tools Toggle */}
          {restrictedTools.length > 0 && (
            <div className="mt-4">
              <button
                onClick={() => setShowRestricted(!showRestricted)}
                className="text-xs text-gray-600 hover:text-gray-800 flex items-center gap-1"
              >
                <span className={`transform transition-transform ${showRestricted ? 'rotate-90' : ''}`}>
                  ▶
                </span>
                {showRestricted ? 'Hide' : 'Show'} {restrictedTools.length} restricted tool{restrictedTools.length !== 1 ? 's' : ''}
              </button>

              {showRestricted && (
                <div className="mt-3 space-y-2">
                  {restrictedTools.map((tool) => (
                    <div
                      key={tool.name}
                      className="p-3 bg-gray-50 border border-gray-200 rounded-lg"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-gray-400 text-sm">🔒</span>
                            <span className="font-mono text-sm font-medium text-gray-700">
                              {tool.name}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 mt-1 ml-6">{tool.description}</p>
                          <p className="text-xs text-gray-500 mt-2 ml-6 font-medium">
                            Required scope: {tool.requiredScopes.join(', ')}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
