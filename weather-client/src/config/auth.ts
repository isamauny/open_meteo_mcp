import { WebStorageStateStore } from 'oidc-client-ts';
import type { AuthProviderProps } from 'react-oidc-context';

/**
 * OIDC configuration for WSO2 Asgardeo MCP Client App.
 *
 * This configuration uses Authorization Code flow with PKCE.
 * MCP Client Apps use local logout (no server-side OIDC logout).
 */
export const oidcConfig: AuthProviderProps = {
  // Asgardeo OAuth2 issuer - keep /token suffix as it's working
  // For Asgardeo MCP Client Apps: https://api.asgardeo.io/t/{org}/oauth2/token
  authority: import.meta.env.VITE_WSO2_IS_URL || 'https://api.asgardeo.io/t/yourorg/oauth2/token',

  // Client ID from Asgardeo MCP Client App
  client_id: import.meta.env.VITE_WSO2_CLIENT_ID || 'weather-client',

  // Redirect URI after successful login (must match Asgardeo config)
  redirect_uri: `${window.location.origin}/callback`,

  // MCP Client Apps use local logout, not server-side OIDC logout
  // Setting this to undefined to avoid logout errors
  post_logout_redirect_uri: undefined,

  // OAuth2 scopes to request
  scope: 'openid read_airquality',

  // Use Authorization Code flow (PKCE is automatic)
  response_type: 'code',

  // Store tokens in sessionStorage for security
  userStore: new WebStorageStateStore({ store: window.sessionStorage }),

  // Automatically renew tokens before expiry
  automaticSilentRenew: false,

  // Handle sign-in callback - redirect to home after processing
  onSigninCallback: (_user) => {
    // Remove the code and state from URL after login
    window.history.replaceState({}, document.title, '/');
    // Navigate to home
    window.location.href = '/';
  },

  // Handle sign-out callback (for local logout)
  onSignoutCallback: () => {
    // Clear any remaining URL parameters
    window.history.replaceState({}, document.title, '/');
    // Navigate to home
    window.location.href = '/';
  },
};

/**
 * MCP Server configuration
 */
export const mcpConfig = {
  // MCP server URL - in development, Vite proxies /mcp to this
  serverUrl: import.meta.env.VITE_MCP_SERVER_URL || 'http://localhost:8080',

  // MCP endpoint path
  endpoint: '/mcp',
};
