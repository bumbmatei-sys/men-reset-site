import { existsSync } from 'node:fs';
import { join } from 'node:path';

/** True when a /public image exists at build time. Missing images render a styled fallback instead of a broken icon. */
export const publicImageExists = (src?: string): src is string => !!src && src.startsWith('/') && existsSync(join(process.cwd(), 'public', src));
