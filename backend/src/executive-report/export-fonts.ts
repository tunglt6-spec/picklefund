import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

/**
 * Nạp font Be Vietnam Pro (Regular/Bold) dạng base64 — DÙNG CHUNG cho HTML Chrome, footer Chromium
 * và fallback jsPDF. Font .ttf do nest-cli copy src/assets/fonts → dist/assets/fonts.
 */
export interface FontsB64 {
  regular: string;
  bold: string;
}
let cache: FontsB64 | null = null;

export function loadFontsBase64(): FontsB64 | null {
  if (cache) return cache;
  const dirs = [
    join(__dirname, '..', 'assets', 'fonts'), // dist/assets/fonts (prod)
    join(__dirname, 'assets', 'fonts'),
    join(process.cwd(), 'dist', 'assets', 'fonts'),
    join(process.cwd(), 'src', 'assets', 'fonts'), // dev / ts-jest
  ];
  for (const d of dirs) {
    const reg = join(d, 'BeVietnamPro-Regular.ttf');
    const bold = join(d, 'BeVietnamPro-Bold.ttf');
    if (existsSync(reg) && existsSync(bold)) {
      cache = {
        regular: readFileSync(reg).toString('base64'),
        bold: readFileSync(bold).toString('base64'),
      };
      return cache;
    }
  }
  return null;
}
