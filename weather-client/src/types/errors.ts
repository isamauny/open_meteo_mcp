/**
 * Custom error types for MCP client errors.
 *
 * Implements MCP specification for OAuth 2.0 error handling:
 * https://modelcontextprotocol.io/specification/2025-11-25/basic/authorization
 */

/**
 * Error thrown when required OAuth2 scopes are missing.
 *
 * This error is created when the server returns a 401 Unauthorized
 * response with WWW-Authenticate header containing scope information.
 */
export class ScopeRequiredError extends Error {
  public readonly requiredScopes: string[];
  public readonly availableScopes: string[];
  public readonly resourceMetadataUrl?: string;
  public readonly statusCode: number = 401;

  constructor(
    message: string,
    requiredScopes: string[],
    availableScopes: string[] = [],
    resourceMetadataUrl?: string
  ) {
    super(message);
    this.name = 'ScopeRequiredError';
    this.requiredScopes = requiredScopes;
    this.availableScopes = availableScopes;
    this.resourceMetadataUrl = resourceMetadataUrl;

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ScopeRequiredError);
    }
  }

  /**
   * Check if this is a scope required error.
   */
  static isScopeRequiredError(error: unknown): error is ScopeRequiredError {
    return error instanceof ScopeRequiredError;
  }
}

/**
 * Parse a 401 response to check if it's a scope error.
 *
 * @param response The fetch Response object
 * @param responseBody The parsed response body (if available)
 * @returns ScopeRequiredError if applicable, null otherwise
 */
export async function parseScopeError(
  response: Response,
  responseBody?: any
): Promise<ScopeRequiredError | null> {
  if (response.status !== 401) {
    return null;
  }

  // Check for WWW-Authenticate header
  const wwwAuthenticate = response.headers.get('WWW-Authenticate');
  if (!wwwAuthenticate) {
    return null;
  }

  // Parse WWW-Authenticate header
  const scopeMatch = wwwAuthenticate.match(/scope="([^"]+)"/);
  const metadataMatch = wwwAuthenticate.match(/resource_metadata="([^"]+)"/);

  if (!scopeMatch) {
    return null;
  }

  const requiredScopes = scopeMatch[1].split(' ');
  const resourceMetadataUrl = metadataMatch ? metadataMatch[1] : undefined;

  // Extract available scopes from response body if present
  const availableScopes =
    responseBody?.available_scopes || responseBody?.availableScopes || [];

  // Get message from response body or use default
  const message =
    responseBody?.message ||
    `Required scopes: ${requiredScopes.join(', ')}`;

  return new ScopeRequiredError(
    message,
    requiredScopes,
    availableScopes,
    resourceMetadataUrl
  );
}
