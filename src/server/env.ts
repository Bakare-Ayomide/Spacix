import dotenv from 'dotenv';

dotenv.config();

export interface ServerEnv {
  APP_URL: string;
  BRAND_NAME: string;
  AUTH_SECRET: string;
  EMAIL_FROM: string;
  SUPPORT_EMAIL: string;
  SIGNUP_BONUS_CREDITS: number;
  MONGODB_URI: string;
  MONGODB_DB: string;
  // Higgsfield
  HF_API_BASE_URL: string;
  HF_CREDENTIALS: string;
  HF_WEBHOOK_SECRET: string;
  HF_WEBHOOK_BASE_URL: string;
  // fal.ai
  FAL_KEY: string;
  FAL_QUEUE_BASE_URL: string;
  FAL_RUN_BASE_URL: string;
  FAL_WEBHOOK_SECRET: string;
  // Muapi.ai
  MUAPI_KEY: string;
  MUAPI_BASE_URL: string;
  // Runware.ai
  RUNWARE_API_KEY: string;
  RUNWARE_BASE_URL: string;
  // Billing & Storage
  CREDIT_USD_VALUE: number;
  CREDIT_MARKUP: number;
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  R2_PUBLIC_BASE_URL: string;
  R2_BUCKET: string;
  CRON_SECRET: string;
  GEMINI_API_KEY: string;
}

export function loadServerEnv(): ServerEnv {
  const creditUsd = Number(process.env.CREDIT_USD_VALUE || '0.01');
  const creditMarkup = Number(process.env.CREDIT_MARKUP || '2.0');
  const signupBonus = Number(process.env.SIGNUP_BONUS_CREDITS ?? '250');

  return {
    APP_URL: process.env.APP_URL || 'http://localhost:3000',
    BRAND_NAME: process.env.NEXT_PUBLIC_BRAND_NAME || process.env.VITE_BRAND_NAME || 'SPACIX',
    AUTH_SECRET: process.env.AUTH_SECRET || '',
    EMAIL_FROM: process.env.EMAIL_FROM || 'SPACIX <noreply@spacix.ticketplaster.com>',
    SUPPORT_EMAIL: process.env.SUPPORT_EMAIL || 'support@spacix.ticketplaster.com',
    SIGNUP_BONUS_CREDITS: Number.isNaN(signupBonus) ? 250 : signupBonus,
    MONGODB_URI: process.env.MONGODB_URI || '',
    MONGODB_DB: process.env.MONGODB_DB || 'spacix-studio',
    HF_API_BASE_URL: (process.env.HF_API_BASE_URL || 'https://api.higgsfield.ai').replace(/\/$/, ''),
    HF_CREDENTIALS: process.env.HF_CREDENTIALS || '',
    HF_WEBHOOK_SECRET: process.env.HF_WEBHOOK_SECRET || '',
    HF_WEBHOOK_BASE_URL: (process.env.HF_WEBHOOK_BASE_URL || '').replace(/\/$/, ''),
    FAL_KEY: process.env.FAL_KEY || '',
    FAL_QUEUE_BASE_URL: (process.env.FAL_QUEUE_BASE_URL || 'https://queue.fal.run').replace(/\/$/, ''),
    FAL_RUN_BASE_URL: (process.env.FAL_RUN_BASE_URL || 'https://fal.run').replace(/\/$/, ''),
    FAL_WEBHOOK_SECRET: process.env.FAL_WEBHOOK_SECRET || '',
    MUAPI_KEY: process.env.MUAPI_KEY || '',
    MUAPI_BASE_URL: (process.env.MUAPI_BASE_URL || 'https://api.muapi.ai/v1').replace(/\/$/, ''),
    RUNWARE_API_KEY: process.env.RUNWARE_API_KEY || '',
    RUNWARE_BASE_URL: (process.env.RUNWARE_BASE_URL || 'https://api.runware.ai/v1').replace(/\/$/, ''),
    CREDIT_USD_VALUE: Number.isNaN(creditUsd) || creditUsd <= 0 ? 0.01 : creditUsd,
    CREDIT_MARKUP: Number.isNaN(creditMarkup) || creditMarkup <= 0 ? 2.0 : creditMarkup,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || '',
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || '',
    R2_PUBLIC_BASE_URL: (process.env.R2_PUBLIC_BASE_URL || '/api/r2').replace(/\/$/, ''),
    R2_BUCKET: process.env.R2_BUCKET || 'spacix-media',
    CRON_SECRET: process.env.CRON_SECRET || '',
    GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  };
}

export const env = loadServerEnv();
