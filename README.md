# Find matching tags ghapi

This action lets you filter a repository's tags by regex using the GitHub API.

## Inputs

| name      | description                                                                                                                                                                              | required | default              |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | -------------------- |
| regex     | regex pattern to match a tag with                                                                                                                                                        | true     |                      |
| flags     | regex flags applied to the pattern (e.g. `i` for case-insensitive)                                                                                                                       | false    | ``                   |
| owner     | repository owner username or organization name. Defaults to the repository of the calling workflow                                                                                       | false    | current repo owner   |
| repo      | repository name. Defaults to the repository of the calling workflow                                                                                                                      | false    | current repo name    |
| token     | github token used to authenticate API calls. See [docs](https://docs.github.com/en/rest/overview/resources-in-the-rest-api#requests-from-github-actions). Defaults to the workflow token | false    | `${{ github.token }}` |
| per_page  | results per page to fetch, between [1,100]                                                                                                                                               | false    | `100`                |
| page      | page number to fetch from (ignored when `paginate` is true)                                                                                                                              | false    | `1`                  |
| paginate  | when true, fetch every tag across all pages (ignores the `page` input)                                                                                                                   | false    | `true`               |
| sort      | sort order: `asc` / `desc` (alphabetical) or `semver` / `semver-desc`                                                                                                                    | false    | `asc`                |

## Outputs

| name  | description                  |
| ----- | ---------------------------- |
| tags  | JSON array of matched tags   |
| count | number of matched tags       |

## Example usage

```yml
- name: Find matching tags
  id: find_matching_tags
  uses: Rochet2/find-matching-tags-ghapi@v2
  with:
    regex: ^TEST.*
    sort: asc
    # owner, repo, and token all default to the current workflow context

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

### Semver sort

```yml
- name: Latest matching release tag
  id: latest
  uses: Rochet2/find-matching-tags-ghapi@v2
  with:
    regex: ^v\d+\.\d+\.\d+$
    sort: semver-desc

- name: Use latest
  env:
    TAG: ${{ fromJson(steps.latest.outputs.tags)[0] }}
  run: echo "Latest is $TAG"
```

### Case-insensitive match

```yml
- name: Find matching tags (case-insensitive)
  uses: Rochet2/find-matching-tags-ghapi@v2
  with:
    regex: ^test-.*
    flags: i
```

### Single page only

```yml
- name: First page of tags only
  uses: Rochet2/find-matching-tags-ghapi@v2
  with:
    regex: ^v
    paginate: 'false'
    per_page: 30
    page: 1
```

## Versioning

Pin to the moving major-version tag (`@v2`) to automatically get backward-compatible bug fixes and improvements:

```yml
uses: Rochet2/find-matching-tags-ghapi@v2
```

If you want to pin to an exact release instead, use the full tag (`@v2.0.0`) or a commit SHA. The older `@v1` line remains available for legacy consumers but will not receive new features.

The `v<MAJOR>` tag is moved automatically by `.github/workflows/release.yml` whenever a `vX.Y.Z` release is published.

## Maintainer guide

### Releasing a new version

1. Go to **Releases → Draft a new release** on GitHub.
2. Pick a tag in semver form: `vX.Y.Z` (patch for fixes, minor for additive changes, major for anything that can break consumers).
3. Click **Publish release**.

The **Update major-version tag** workflow then moves `v<MAJOR>` to the same commit, so consumers pinned to `@v2` automatically pick up the release. Prereleases like `v2.0.0-rc1` are intentionally ignored by the major-tag mover.

### When `dist/` falls out of sync

`dist/index.js` is the bundled output that GitHub actually runs. It is rebuilt automatically by the **Build dist** workflow whenever `index.js`, `action.yml`, or the lockfile change on `main` or on a Dependabot branch.

You only have to touch this yourself when CI says `dist/ is out of date` on a non-Dependabot PR: open **Actions → Build dist → Run workflow** and pick that branch.

### Dependency updates

Dependabot opens PRs automatically — `github-actions` weekly, `npm` monthly. On Dependabot branches, **Build dist** runs itself after the lockfile changes, so you usually just merge when CI is green.
