<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Tooling

Bun is the package manager and runtime: `bun install`, `bun run dev`, `bun run build`.
There is no npm lockfile and no Node on the dev machine. `bunfig.toml` preloads
`bun-preload.ts`, which patches a `node:v8` gap that would otherwise crash any
route importing the mongodb driver.
