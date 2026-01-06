#!/usr/bin/env node
/**
 * Build script for background.js
 * Loads .env and injects VITE_* variables into esbuild
 */
import * as esbuild from 'esbuild';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');

// Parse .env file
function parseEnv(filePath) {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const env = { DEV: false };
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const [key, ...valueParts] = trimmed.split('=');
      if (key?.startsWith('VITE_')) {
        env[key] = valueParts.join('=').replace(/^["']|["']$/g, '');
      }
    }
    return env;
  } catch {
    console.warn('.env file not found, using empty config');
    return { DEV: false };
  }
}

const envVars = parseEnv(resolve(rootDir, '.env'));

await esbuild.build({
  entryPoints: [resolve(rootDir, 'src/background/index.ts')],
  bundle: true,
  outfile: resolve(rootDir, 'dist/background.js'),
  format: 'esm',
  alias: { '@': resolve(rootDir, 'src') },
  define: {
    'import.meta.env': JSON.stringify(envVars),
  },
});

console.log('✅ background.js built with env vars');
