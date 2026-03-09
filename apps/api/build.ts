import { build } from 'bun';

await build({
  entrypoints: ['./src/index.ts'],
  root: './src',
  outdir: './dist',
  target: 'bun',
  packages: 'external',
  minify: {
    identifiers: false,
    keepNames: false,
    syntax: true,
    whitespace: true,
  },
});
