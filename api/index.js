import { handle } from 'hono/vercel';
import app from '../dist/index.js';

export const config = {
  runtime: 'nodejs',
};

export default handle(app);
