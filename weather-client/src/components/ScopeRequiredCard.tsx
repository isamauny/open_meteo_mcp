import { AlertCircle, ShieldAlert, Info } from 'lucide-react';

interface ScopeRequiredCardProps {
  requiredScopes: string[];
  availableScopes?: string[];
  message?: string;
  resourceMetadataUrl?: string;
}

/**
 * Component to display scope requirement errors per MCP specification.
 *
 * Parses and displays the WWW-Authenticate header information when
 * a 401 Unauthorized response is received due to insufficient scopes.
 *
 * @see https://modelcontextprotocol.io/specification/2025-11-25/basic/authorization
 */
export function ScopeRequiredCard({
  requiredScopes,
  availableScopes = [],
  message,
  resourceMetadataUrl,
}: ScopeRequiredCardProps) {
  const missingScopes = requiredScopes.filter(
    (scope) => !availableScopes.includes(scope)
  );

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 space-y-4">
      {/* Header */}
      <div className="flex items-start gap-3">
        <ShieldAlert className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-amber-900">
            Additional Permission Required
          </h3>
          <p className="text-amber-700 text-sm mt-1">
            {message || 'This resource requires additional OAuth2 scopes'}
          </p>
        </div>
      </div>

      {/* Required Scopes */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium text-amber-900">
          <AlertCircle className="w-4 h-4" />
          <span>Required Scopes:</span>
        </div>
        <div className="ml-6 space-y-1">
          {requiredScopes.map((scope) => {
            const isMissing = missingScopes.includes(scope);
            return (
              <div
                key={scope}
                className={`flex items-center gap-2 text-sm ${
                  isMissing
                    ? 'text-red-700 font-medium'
                    : 'text-green-700'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    isMissing ? 'bg-red-500' : 'bg-green-500'
                  }`}
                />
                <code className="bg-white px-2 py-0.5 rounded border">
                  {scope}
                </code>
                {isMissing && (
                  <span className="text-xs">(missing)</span>
                )}
                {!isMissing && (
                  <span className="text-xs">(granted)</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Available Scopes */}
      {availableScopes.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-amber-900">
            <Info className="w-4 h-4" />
            <span>Your Current Scopes:</span>
          </div>
          <div className="ml-6">
            <div className="flex flex-wrap gap-2">
              {availableScopes.map((scope) => (
                <code
                  key={scope}
                  className="text-xs bg-white px-2 py-1 rounded border text-gray-700"
                >
                  {scope}
                </code>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Action Required */}
      <div className="bg-white border border-amber-200 rounded p-4">
        <h4 className="text-sm font-semibold text-amber-900 mb-2">
          What to do:
        </h4>
        <ol className="text-sm text-amber-800 space-y-2 list-decimal list-inside">
          <li>
            Sign out of your current session
          </li>
          <li>
            Contact your administrator to request the following scope(s):
            <div className="mt-1 ml-5">
              {missingScopes.map((scope) => (
                <code
                  key={scope}
                  className="block bg-amber-100 px-2 py-1 rounded text-xs my-1"
                >
                  {scope}
                </code>
              ))}
            </div>
          </li>
          <li>
            Sign in again once the scopes have been granted
          </li>
        </ol>
      </div>

      {/* Resource Metadata Link */}
      {resourceMetadataUrl && (
        <div className="text-xs text-amber-700">
          <a
            href={resourceMetadataUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-amber-900"
          >
            View OAuth resource metadata
          </a>
        </div>
      )}
    </div>
  );
}

/**
 * Parse WWW-Authenticate header per MCP specification.
 *
 * Example header:
 * WWW-Authenticate: Bearer resource_metadata="https://mcp.example.com/.well-known/oauth-protected-resource",
 *                          scope="files:read files:write"
 *
 * @param wwwAuthenticate The WWW-Authenticate header value
 * @returns Parsed scope and metadata information
 */
export function parseWWWAuthenticate(wwwAuthenticate: string): {
  scopes: string[];
  resourceMetadataUrl?: string;
} {
  const scopes: string[] = [];
  let resourceMetadataUrl: string | undefined;

  // Extract scope parameter
  const scopeMatch = wwwAuthenticate.match(/scope="([^"]+)"/);
  if (scopeMatch && scopeMatch[1]) {
    scopes.push(...scopeMatch[1].split(' '));
  }

  // Extract resource_metadata parameter
  const metadataMatch = wwwAuthenticate.match(/resource_metadata="([^"]+)"/);
  if (metadataMatch && metadataMatch[1]) {
    resourceMetadataUrl = metadataMatch[1];
  }

  return { scopes, resourceMetadataUrl };
}
