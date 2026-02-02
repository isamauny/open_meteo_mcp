import { WebStorageStateStore } from 'oidc-client-ts';
import type { AuthProviderProps } from 'react-oidc-context';

/**
 * OIDC configuration for WSO2 Identity Server / Asgardeo.
 *
 * This configuration uses the Authorization Code flow with PKCE,
 * which is the recommended flow for Single Page Applications.
 */
export const oidcConfig: AuthProviderProps = {
  // WSO2 IS / Asgardeo base URL (OAuth2/OIDC issuer)
  // For Asgardeo: https://api.asgardeo.io/t/{org}/oauth2
  authority: import.meta.env.VITE_WSO2_IS_URL || 'https://localhost:9443/oauth2',

  // Client ID registered in WSO2 IS / Asgardeo
  client_id: import.meta.env.VITE_WSO2_CLIENT_ID || 'weather-client',

  // Redirect URI after successful login
  redirect_uri: `${window.location.origin}/callback`,

  // Redirect URI after logout
  post_logout_redirect_uri: window.location.origin,

  // OAuth2 scopes to request
  scope: 'openid read_airquality',

  // Use Authorization Code flow (PKCE is automatic)
  response_type: 'code',

  // Store tokens in sessionStorage for security
  userStore: new WebStorageStateStore({ store: window.sessionStorage }),

  // Automatically renew tokens before expiry
  automaticSilentRenew: false, // Disable for now to avoid issues

  // Handle sign-in callback - redirect to home after processing
  onSigninCallback: (_user) => {
    // Remove the code and state from URL after login
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
