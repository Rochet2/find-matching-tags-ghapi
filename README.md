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

### Releasing a new version

1. Go to **Releases → Draft a new release** on GitHub.
2. Pick a tag in semver form: `vX.Y.Z` (patch for fixes, minor for additive changes, major for anything that can break consumers).
3. Click **Publish release**.

The `Update major-version tag` workflow then moves `v<MAJOR>` to the same commit, so consumers pinned to `@v1` automatically pick up the release. Prereleases like `v2.0.0-rc1` are intentionally ignored by the major-tag mover.

### When `dist/` falls out of sync

`dist/index.js` is the bundled output that GitHub actually runs. It is rebuilt automatically by the **Build dist** workflow whenever `index.js`, `action.yml`, or the `package.json` / `package-lock.json` files change on `main`.

You only have to touch this yourself in two situations:

- **CI tells you `dist/ is out of date` on a PR** — open the **Actions** tab, choose **Build dist**, click **Run workflow**, and pick the PR's branch. It rebuilds `dist/` and commits to the branch, after which CI will re-run and pass.
- **You merged a Dependabot PR and want the new deps reflected immediately** — same thing, but run **Build dist** on `main`.

If you ever want to do it locally instead:

```sh
npm ci
npm run build
git add dist && git commit -m "Rebuild dist"
```

### Dependency updates

Dependabot opens PRs automatically — `github-actions` weekly, `npm` monthly. The flow above ("run Build dist on the PR branch") applies to those PRs too.
