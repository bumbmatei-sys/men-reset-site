import { existsSync } from 'node:fs';
import { join } from 'node:path';

/** True when a /public image exists at build time. Missing images render a styled fallback instead of a broken icon. */
export const publicImageExists = (src?: string): src is string => !!src && src.startsWith('/') && existsSync(join(process.cwd(), 'public', src));

/** Share-image props for a /public image: src, alt and real pixel size, or undefined when the file is missing. */
export async function shareImage(image?: { src: string; alt?: string }): Promise<{ src: string; alt?: string; width?: number; height?: number } | undefined> {
  if (!image || !publicImageExists(image.src)) return undefined;
  try {
    const { default: sharp } = await import('sharp');
    const meta = await sharp(join(process.cwd(), 'public', image.src)).metadata();
    return { src: image.src, alt: image.alt, width: meta.width, height: meta.height };
  } catch {
    return { src: image.src, alt: image.alt };
  }
}
