<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Tooling

Bun is the package manager — `bun install`, `bun run dev`, `bun run build` — and
there is no npm lockfile. The scripts themselves execute on Node, which bun
spawns for node-shebang binaries like `next`, matching what Vercel builds on.

Two things run on Bun's own runtime instead: `bun --bun`, and `bun file.ts`. That
runtime is missing pieces the mongodb driver needs, so:

- `bunfig.toml` preloads `bun-preload.ts`, patching the `node:v8` gap that would
  otherwise crash anything importing the driver.
- `dns.resolveSrv` is broken on Windows, so a `mongodb+srv://` URI can't resolve.
  Run one-off scripts that talk to Atlas with `node`, not `bun`.
