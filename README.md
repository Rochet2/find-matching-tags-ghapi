# Find matching tags ghapi

This action lets you filter a repository's tags by regex using the GitHub API.

## Inputs

| name      | description                                                                                                                                                                              | required | default              |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | -------------------- |
| regex     | regex pattern to match a tag with                                                                                                                                                        | true     |                      |
| flags     | regex flags applied to the pattern (e.g. `i` for case-insensitive)                                                                                                                       | false    | ``                   |
| owner     | repository owner username or organization name                                                                                                                                           | true     |                      |
| repo      | repository name                                                                                                                                                                          | true     |                      |
| token     | github token used to authenticate API calls. See [docs](https://docs.github.com/en/rest/overview/resources-in-the-rest-api#requests-from-github-actions). Defaults to the workflow token | false    | `${{ github.token }}` |
| per_page  | results per page to fetch, between [1,100]                                                                                                                                               | false    | `30`                 |
| page      | page number to fetch from (ignored when `paginate` is true)                                                                                                                              | false    | `1`                  |
| paginate  | when true, fetch every tag across all pages (ignores the `page` input)                                                                                                                   | false    | `false`              |
| sort      | sort order of output tags, `asc` or `desc`                                                                                                                                               | false    | `asc`                |

## Outputs

| name  | description                  |
| ----- | ---------------------------- |
| tags  | JSON array of matched tags   |
| count | number of matched tags       |

## Example usage

```yml
- name: Find matching tags
  id: find_matching_tags
  uses: Rochet2/find-matching-tags-ghapi@v1
  with:
    regex: ^TEST.*
    sort: asc
    owner: Rochet2
    repo: find-matching-tags-ghapi
    # token defaults to ${{ github.token }} so this line is optional
    # token: ${{ secrets.GITHUB_TOKEN }}

- name: Assert tags
  env:
    ACTUAL: ${{ steps.find_matching_tags.outputs.tags }}
    EXPECTED: '["TEST-1","TEST-2","TEST-3"]'
  run: |
    if [ "$ACTUAL" != "$EXPECTED" ]; then
      echo "::error::Expected $EXPECTED, got $ACTUAL"
      exit 1
    fi

- name: Print outputs
  env:
    TAGS: ${{ steps.find_matching_tags.outputs.tags }}
  run: echo "Output $TAGS"

- name: Print first tag
  env:
    TAGS: ${{ steps.find_matching_tags.outputs.tags }}
  run: echo "$TAGS" | jq -r '.[0]'
```

### Fetch every matching tag across all pages

```yml
- name: Find all matching tags
  uses: Rochet2/find-matching-tags-ghapi@v1
  with:
    regex: ^v\d+\.\d+\.\d+$
    paginate: 'true'
    owner: Rochet2
    repo: find-matching-tags-ghapi
```

### Case-insensitive match

```yml
- name: Find matching tags (case-insensitive)
  uses: Rochet2/find-matching-tags-ghapi@v1
  with:
    regex: ^test-.*
    flags: i
    owner: Rochet2
    repo: find-matching-tags-ghapi
```

## Versioning

Pin to the moving major-version tag (`@v1`) to automatically get backward-compatible bug fixes and improvements:

```yml
uses: Rochet2/find-matching-tags-ghapi@v1
```

If you want to pin to an exact release instead, use the full tag (`@v1.2.0`) or a commit SHA.

The `v<MAJOR>` tag is moved automatically by `.github/workflows/release.yml` whenever a `vX.Y.Z` release is published.

## Maintainer guide

### Repository layout

| Path                          | Purpose                                                                |
| ----------------------------- | ---------------------------------------------------------------------- |
| `index.js`                    | Action source (ESM).                                                   |
| `dist/index.js`               | Bundled output that the action runtime actually executes.              |
| `action.yml`                  | Action metadata (inputs, outputs, runtime, branding).                  |
| `.github/workflows/test.yml`  | CI: verifies `dist/` is in sync and runs end-to-end tests on every push and PR. |
| `.github/workflows/install.yml` | Manual workflow that rebuilds `dist/` on the default branch and commits it. |
| `.github/workflows/release.yml` | Auto-moves the `vMAJOR` tag whenever a `vX.Y.Z` GitHub Release is published. |
| `.github/dependabot.yml`      | Weekly `github-actions` updates, monthly `npm` updates.                |

### Development loop

The action is bundled with [`@vercel/ncc`](https://github.com/vercel/ncc) so it can run without `node_modules`. After editing `index.js`:

```sh
npm ci
npm run build
git add dist
git commit -m "..."
```

CI (`verify_build` job in `test.yml`) fails if `dist/` is not in sync with `index.js`, so always rebuild before pushing.

Source maps are intentionally disabled (`ncc` embeds absolute source paths in `*.map`, which breaks reproducibility across machines).

### Tests

`test.yml` runs on every `push` and `pull_request` and contains two jobs:

1. `verify_build` — runs `npm ci && npm run build` and fails if it produces any diff under `dist/`.
2. `filter_tags_job` — invokes the local action (`uses: ./`) against this repo's own `TEST-*` tags and asserts on the outputs with plain shell (no third-party assertion action).

There are no separate unit tests; the integration job above covers the full path.

### Cutting a release

1. Make sure `main` is green and `dist/` is up to date.
2. Decide the next version following semver:
   - Patch (`vX.Y.Z+1`) — bug fixes, no input/output changes.
   - Minor (`vX.Y+1.0`) — backward-compatible additions (new optional input/output, new behavior gated behind a default).
   - Major (`vX+1.0.0`) — anything that can break existing consumers (removed/renamed input, changed default, runtime bump).
3. On GitHub, go to **Releases → Draft a new release**:
   - Tag: `vX.Y.Z` (target `main`, create new tag).
   - Title: `vX.Y.Z` (or a short summary).
   - Notes: auto-generate is fine; edit as needed.
   - Click **Publish release**.
4. `release.yml` triggers on the `release: [published]` event, verifies the tag matches `^v[0-9]+\.[0-9]+\.[0-9]+$`, and force-moves `v<MAJOR>` to the same commit. Consumers pinned to `@vMAJOR` pick up the release on their next workflow run.

If you publish a prerelease (e.g. `v2.0.0-rc1`) the release workflow skips the major-tag update, so the moving tag isn't polluted by prereleases.

### Manually rebuilding `dist/` from a workflow

If you want to rebuild `dist/` without doing it locally (for example after a Dependabot PR merges into `main`), trigger the `Build dist` workflow from the Actions tab (`workflow_dispatch`). It runs `npm ci && npm run build` and commits any resulting change to the default branch.

### Dependency updates

Dependabot opens PRs automatically:

- `github-actions` — weekly. Keeps `actions/checkout`, `actions/setup-node`, etc. on the latest major.
- `npm` — monthly. Bumps `@actions/core`, `@actions/github`, `@vercel/ncc`.

After merging a Dependabot PR, run **Build dist** (or do it locally) so the bundled `dist/index.js` reflects the new dependency versions.
