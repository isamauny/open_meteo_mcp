/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_WSO2_IS_URL: string;
  readonly VITE_WSO2_CLIENT_ID: string;
  readonly VITE_MCP_SERVER_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
