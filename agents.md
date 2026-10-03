# agents.md

Short rules for any coding agent working in this repository. Full guidance: `CLAUDE.md`; plan: `docs/PLAN.md`; product truth: `PRODUCT.md`; visual system: `DESIGN.md`.

- Finish the task as asked. Before calling it done, run the gate: `npx convex dev --once`, `npm run lint`, `npx tsc --noEmit`, `npm run build`.
- When implementing features of external libraries or APIs (not internal code), look up current documentation on Context7 first.
- Use the available MCP tools where they fit (e.g. browser/devtools to check console errors and rendered pages).
- Production is off limits: no `convex deploy`, no `--prod`, no `vercel`, no `git push`. Convex DEV only.
- Never invent business data (prices, contacts, testimonials, numbers). Never commit secrets.
- UI copy: Serbian Latin first with correct diacritics, English second, formal "Vi", no emojis.
