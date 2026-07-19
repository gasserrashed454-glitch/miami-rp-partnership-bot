import { build } from 'esbuild';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

await build({
  entryPoints: [resolve(__dirname, 'src/index.ts')],
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  outfile: resolve(__dirname, 'dist/index.js'),
  sourcemap: true,
  // Exclude native/optional discord.js deps not needed in production
  external: ['@discordjs/opus', 'sodium-native', 'bufferutil', 'utf-8-validate'],
});

console.log('✅ Discord bot built to dist/index.js');
