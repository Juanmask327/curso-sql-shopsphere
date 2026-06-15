import type { Config } from 'drizzle-kit';
import { config } from 'dotenv';

config();

if (!process.env['DATABASE_URL']) {
  throw new Error('DATABASE_URL is required for drizzle-kit');
}

export default {
  schema: './src/shared/db/schema.ts',
  out: './src/shared/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env['DATABASE_URL'],
  },
  verbose: true,
  strict: true,
} satisfies Config;
