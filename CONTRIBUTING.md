# Contributing

This project favors small, tested changes that keep the daily feed reliable for real users.

## Branches

- Use `main` for stable releases.
- Use `paper-daily-feed-dev` for backend recommendation changes that should soak before release.
- Keep feature branches focused. Prefer one behavior change per branch.

## Development Flow

1. Create or update tests for behavior changes.
2. Run local verification before pushing:

```powershell
npm run build
npm test
```

If local `npm test` fails because the default Node.js is older than the project requirement, run tests with Node.js 20 or newer. On this machine:

```powershell
& 'C:\Program Files\nodejs\node.exe' .\node_modules\vitest\vitest.mjs run
```

3. Commit with a Conventional Commit message. See [docs/conventionalcommits.md](docs/conventionalcommits.md).
4. Push the branch and run GitHub Actions before merging.

## GitHub Actions

- `Test paper feeds` is the safer validation workflow. It uses repository variables/secrets and limits output with `PAPER_LIMIT=3`.
- `Daily paper feeds` runs the real delivery flow and updates delivery history.
- Scheduled workflows run from the default branch only. To test a dev branch, use `workflow_dispatch` and select the branch, such as `paper-daily-feed-dev`.

## Configuration

- Keep user-facing setup simple in `README.md` and `README.zh-CN.md`.
- Advanced backend defaults can live in `config/app.example.jsonc`.
- Never commit secrets. Use GitHub repository variables for non-secret config and GitHub secrets for credentials.

## Documentation

- If `README.md` changes, update `README.zh-CN.md` in the same change.
- Keep docs practical: describe what users or contributors need to do, not implementation internals unless they affect operation.

## Recommendation Changes

Recommendation logic affects real email quality. For important updates:

- Add focused tests for ranking behavior.
- Run a manual `Test paper feeds` workflow on the dev branch.
- Let the dev branch run manually for several days if the change affects scoring, filtering, delivery history, or email volume.
- Merge to `main` only after the results look stable.

