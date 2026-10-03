# Step 03 — Bezbednost: izvršenje plana
<!-- mode: auto · effort: high · session: S2 (resume) -->

Execute the security plan you produced in step 02 (saved in `docs/plans/02-security.md`). Follow `night-run/NIGHT_RULES.md`.

- Before the first schema change: `npx convex export --path night-run/backups/03-<timestamp>.zip` (DEV).
- DEV only. Env vars with `npx convex env set NAME value` (never `--prod`). Never print secret values into logs or commit them.
- Create the owner account as planned; write the generated password only to `night-run/SECRETS.local.md` (gitignored), with one line of instructions in Serbian ("Prijavi se na /auth i odmah promeni lozinku u Admin → Podešavanja → Korisnici").
- Also create a test editor account for QA (`qa-editor@ablux.local`, random password, same file).
- Keep the existing admin editors working after login.
- Run the test checklist from the plan and record results. Update the auth section of `CLAUDE.md`.
- Gate, commit, and add "Korak 03" to `night-run/NIGHT_REPORT.md` (what is protected now, how to log in, anything left open).
