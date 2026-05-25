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

## Development

The action is bundled with [`@vercel/ncc`](https://github.com/vercel/ncc) into `dist/index.js` so it can run without `node_modules`. After editing `index.js`:

```sh
npm ci
npm run build
git add dist
```

CI will fail if `dist/` is not in sync with `index.js`.
