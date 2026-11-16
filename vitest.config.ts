import { defineConfig } from 'vitest/config';
import path from 'path';

// Unit tests cover the data layer (src/lib/supabase/*) with a stubbed Supabase
// client. Browser/E2E coverage stays in tests/*.spec.ts (Playwright).
export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.ts'],
    reporters: ['default'],
  },
});
