/// <reference path="../.astro/types.d.ts" />

import type { SupabaseClient, User } from '@supabase/supabase-js';
import type { Lang } from './lib/i18n/index';

declare namespace App {
  interface Locals {
    supabase: SupabaseClient;
    user: User | null;
    isAdmin: boolean;
    lang: Lang;
    t: (key: string, vars?: Record<string, string>) => string;
  }
}

interface ImportMetaEnv {
  // ─── Supabase (client-safe: anon key) ───────────────────────────────────
  readonly PUBLIC_SUPABASE_URL: string;
  readonly PUBLIC_SUPABASE_ANON_KEY: string;

  // ─── Supabase (server-only: service role) ───────────────────────────────
  readonly SUPABASE_SERVICE_ROLE_KEY: string;

  // ─── PayPal ──────────────────────────────────────────────────────────────
  readonly PAYPAL_CLIENT_ID: string;
  readonly PAYPAL_CLIENT_SECRET: string;
  readonly PAYPAL_WEBHOOK_ID: string;
  readonly PAYPAL_MODE: 'sandbox' | 'live';

  // ─── OpenAI ──────────────────────────────────────────────────────────────
  readonly OPENAI_API_KEY: string;

  // ─── App ─────────────────────────────────────────────────────────────────
  readonly PUBLIC_SITE_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
