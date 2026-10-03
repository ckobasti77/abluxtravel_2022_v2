# Step 17 — Dependencies to latest + Turbopack dev (2 Oct 2026)

Upgrade all npm dependencies of this project to their latest versions, safely. Today is demo day: branch ablux-2.0 must stay demo-ready.

## Rules
- Read CLAUDE.md first and follow it. Never read or commit hostinger-recovery-codes.txt or payoneer-recovery-code.txt.
- Local only: no git push, no deploy, no Vercel, no Convex production. Convex DEV only (`npx convex dev --once`).
- The dev server stays on Turbopack (`"dev": "next dev"`, no `--webpack`). If something breaks under Turbopack, fix the cause instead of switching back to webpack.
- Run every check in the foreground and wait for it. Never end a turn while a check, server or script is still running.

## Steps
0. On ablux-2.0, commit what is pending (the Turbopack switch in package.json, next.config.ts, CLAUDE.md, README.md, plus night-run/NIGHT_REPORT.md and this file) as "dev: Turbopack umesto webpack-a". Then `git switch -c deps-latest`.
1. Baseline: save the output of `npm outdated`. Run the gate and note the results: `npx convex dev --once`, `npm run lint`, `npx tsc --noEmit`, `npm test`, `npm run build`.
2. Minor and patch updates (same major), one commit: next and eslint-config-next to the same latest 16.x (keep exact pins), react and react-dom to the latest 19.x (exact pins), @types/react, @types/react-dom, convex, tailwindcss and @tailwindcss/postcss, lucide-react, gsap, fuse.js, zustand, and every other package that is behind within its major. Read the release notes for next 16.2 and 16.3, convex 1.33 to 1.46 and lucide-react (renamed icons) and apply what they require. Run the gate and fix what breaks.
3. Majors, one commit each, each followed by the full gate:
   - eslint 10: only if eslint-config-next and its plugins declare support for it; otherwise stay on the latest 9.x and note why.
   - typescript 7 (the native compiler): try it. If next build type checking, typescript-eslint, vitest or tsx do not work with it, stay on the newest version that works and note why.
   - @types/node: match the major of the installed Node (`node -v`), not the newest @types/node.
4. Clean up: remove dependencies the code no longer imports (check `lucia`, which is deprecated and probably unused since Convex Auth). Run `npm audit` and apply only non-breaking fixes. Run `npm dedupe`.
5. Prove it works:
   - `npm run dev` must show Turbopack. Open /, /ponude, one offer page, /auth and /admin: status 200, no console errors, the hero video plays.
   - Production build, start on port 3137, run `scripts/qa/run-qa.mjs` as night-run/NIGHT_REPORT.md describes, and compare with night-run/qa/15/run/summary.md.
6. Finish with a short report in Serbian, appended to night-run/NIGHT_REPORT.md as `## Korak 17 — Paketi na latest` and repeated as your final message: what went from which version to which, what was held back and why, gate and QA results, and how to merge (`git switch ablux-2.0 && git merge deps-latest`). Do not merge yourself.
