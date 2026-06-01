/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_N8N_WEBHOOK_BASE_URL: string;
  readonly VITE_MINIO_BASE_URL: string;
  readonly VITE_AVATARES_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
