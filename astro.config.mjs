// @ts-check
import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  output: 'server',
  adapter: vercel({
    isr: {
      // Abilita ISR: le pagine pubbliche (blog, shop) vengono
      // ri-generate in background senza bloccare l'utente.
      expiration: 60,
      // Escludi tutte le API route e le pagine di auth dall'ISR
      // (non devono mai essere servite dalla cache)
      exclude: ['/api/.*', '/auth/.*', '/dashboard/.*', '/admin/.*'],
    },
  }),
  vite: {
    plugins: [tailwindcss()],
  },
});