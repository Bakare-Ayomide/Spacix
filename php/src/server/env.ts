export interface RuntimeEnvConfig {
  APP_URL: string;
  BRAND_NAME: string;
  AUTH_SECRET: string;
  EMAIL_FROM: string;
  SUPPORT_EMAIL: string;

  MONGODB_URI: string;
  MONGODB_DB: string;

  HF_API_BASE_URL: string;
  HF_CREDENTIALS: string;
  HF_WEBHOOK_SECRET: string;
  HF_WEBHOOK_BASE_URL: string;

  FAL_KEY: string;
  FAL_QUEUE_BASE_URL: string;
  FAL_RUN_BASE_URL: string;
  FAL_WEBHOOK_SECRET: string;

  MUAPI_KEY: string;
  MUAPI_BASE_URL: string;

  RUNWARE_API_KEY: string;
  RUNWARE_BASE_URL: string;

  CREDIT_USD_VALUE: number;
  CREDIT_MARKUP: number;
  SIGNUP_BONUS_CREDITS: number;

  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;

  R2_PUBLIC_BASE_URL: string;
  R2_BUCKET: string;

  CRON_SECRET: string;
  GEMINI_API_KEY: string;
}

/**
 * Static baseline constants.
 * All operational API keys, secrets, webhooks, and billing parameters are managed
 * by the Admin Console and persisted directly in MySQL (`spacix_secrets`, `spacix_providers`, `spacix_kv_store`).
 */
export function loadEnvConfig(): RuntimeEnvConfig {
  return {
    APP_URL: 'https://spacix.ticketplaster.com',
    BRAND_NAME: 'SPACIX',
    AUTH_SECRET: '',
    EMAIL_FROM: 'SPACIX <noreply@spacix.ticketplaster.com>',
    SUPPORT_EMAIL: 'support@spacix.ticketplaster.com',

    MONGODB_URI: '',
    MONGODB_DB: 'spacix-studio',

    HF_API_BASE_URL: 'https://api.higgsfield.ai',
    HF_CREDENTIALS: '',
    HF_WEBHOOK_SECRET: '',
    HF_WEBHOOK_BASE_URL: '',

    FAL_KEY: '',
    FAL_QUEUE_BASE_URL: 'https://queue.fal.run',
    FAL_RUN_BASE_URL: 'https://fal.run',
    FAL_WEBHOOK_SECRET: '',

    MUAPI_KEY: '',
    MUAPI_BASE_URL: 'https://api.muapi.ai/v1',

    RUNWARE_API_KEY: '',
    RUNWARE_BASE_URL: 'https://api.runware.ai/v1',

    CREDIT_USD_VALUE: 0.01,
    CREDIT_MARKUP: 2.0,
    SIGNUP_BONUS_CREDITS: 250,

    STRIPE_SECRET_KEY: '',
    STRIPE_WEBHOOK_SECRET: '',

    R2_PUBLIC_BASE_URL: '/api/r2',
    R2_BUCKET: 'spacix-media',

    CRON_SECRET: '',
    GEMINI_API_KEY: '',
  };
}

export const env = loadEnvConfig();
