import { serve } from '@hono/node-server';
import { app } from './app.ts';
import { assertConfigured } from './env.ts';

const port = Number(process.env.PORT ?? 3860);
const missing = assertConfigured();
if (missing.length) console.warn('[setup] Not configured yet:', missing.join('; '));
serve({ fetch: app.fetch, port }, info => console.log(`B2B Store app server on http://localhost:${info.port}`));
