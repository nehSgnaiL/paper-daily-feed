# Contributing

- Small, tested changes that keep the daily feed reliable for real users are favored.
- Keep user-facing setup simple in `README.md` and `README.zh-CN.md`.
- If `README.md` changes, update `README.zh-CN.md` in the same change.
- Advanced backend defaults can live in `config/app.example.jsonc`.

## Branches

- Use `main` for stable releases.
- Use `paper-daily-feed-dev` for new feature changes that should soak before release.
- Keep feature branches focused. Prefer one behavior change per branch.

## Development Flow

1. Create or update tests for behavior changes.
2. Run local verification before committing.
3. Commit with a Conventional Commit message. See [ConventionalCommits](https://github.com/conventional-commits/conventionalcommits.org).
4. Push the branch and run GitHub Actions before making a pull request.
