// Vercel entry (Node.js runtime). Bundled into api/index.js by `npm run build`.
import { handle } from '@hono/node-server/vercel';
import { app } from './app.ts';

export default handle(app);
