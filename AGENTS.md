<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Framer placement

When asked to put the nav/music player into a Framer page:

1. Read [`FRAMER.md`](FRAMER.md) and [`framer/AGENT_PROMPT.md`](framer/AGENT_PROMPT.md).
2. Source of truth is [`framer/BlakeMusicPlayer.tsx`](framer/BlakeMusicPlayer.tsx) — push that file into Framer as a code component (`BlakeNavBar`); do not rewrite it.
3. Place one instance on a site-wide overlay: **720×56**, **overflow visible**, scroll off.
4. If Framer External Agent / `/framer` is available, use it. Otherwise instruct the user to connect via `npx @framer/agent@latest setup` or GitHub Link on `framer/`.
