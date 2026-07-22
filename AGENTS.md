# Project instructions

## Release workflow

- Every workflow that includes both a production/distributable build and a Git push must bump the application version before the build and push.
- Run `npm run version:bump` exactly once, then verify that `package.json` and `package-lock.json` contain the same version.
- Prepend the matching user-facing section to `USER_RELEASE_NOTES.txt` before building.
- Run the full test suite and production build before committing and pushing.
- When users must receive the in-app update prompt, publish a GitHub Release with the matching `v<version>` tag and installer assets; a Git push alone is not sufficient.
- Never commit `docs/supabase/creds.txt` or files from `build/private/`.
