/**
 * build-test.mjs — compiles test-image-gen.ts into dist-test/ using esbuild
 * Run via:  node ./build-test.mjs
 */
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build as esbuild } from "esbuild";
import { rm } from "node:fs/promises";

globalThis.require = createRequire(import.meta.url);

const artifactDir = path.dirname(fileURLToPath(import.meta.url));
const distDir     = path.resolve(artifactDir, "dist-test");

await rm(distDir, { recursive: true, force: true });

await esbuild({
  entryPoints: [path.resolve(artifactDir, "src/test-image-gen.ts")],
  platform:    "node",
  bundle:      true,
  format:      "esm",
  outdir:      distDir,
  outExtension: { ".js": ".mjs" },
  logLevel:    "warning",
  external:    ["*.node", "sharp"],
  sourcemap:   "linked",
  banner: {
    js: `import { createRequire as __bannerCrReq } from 'node:module';
import __bannerPath from 'node:path';
import __bannerUrl from 'node:url';
globalThis.require = __bannerCrReq(import.meta.url);
globalThis.__filename = __bannerUrl.fileURLToPath(import.meta.url);
globalThis.__dirname = __bannerPath.dirname(globalThis.__filename);
`,
  },
});

console.log("Test build complete → dist-test/test-image-gen.mjs");
