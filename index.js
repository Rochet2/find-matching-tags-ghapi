import * as core from '@actions/core';
import * as github from '@actions/github';
import semver from 'semver';

const ALLOWED_SORTS = new Set(['asc', 'desc', 'semver', 'semver-desc']);

const parseIntInRange = (name, value, { min = 1, max = Number.MAX_SAFE_INTEGER } = {}) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || String(parsed) !== String(value).trim() || parsed < min || parsed > max) {
    throw new Error(`Input "${name}" must be an integer in [${min}, ${max}], got "${value}"`);
  }
  return parsed;
};

const normalizeSort = (raw) => {
  const sort = (raw || 'asc').toLowerCase();
  if (!ALLOWED_SORTS.has(sort)) {
    throw new Error(`Input "sort" must be one of ${[...ALLOWED_SORTS].join(', ')}, got "${raw}"`);
  }
  return sort;
};

const compareSemver = (a, b) => {
  const aa = semver.coerce(a);
  const bb = semver.coerce(b);
  if (!aa && !bb) return a.localeCompare(b);
  if (!aa) return 1;
  if (!bb) return -1;
  return semver.compare(aa, bb);
};

export const filterAndSortTags = (tags, regex, flags, sort) => {
  const pattern = new RegExp(regex, flags || '');
  const matched = tags.map((t) => t.name).filter((name) => pattern.test(name));

  if (sort === 'semver' || sort === 'semver-desc') {
    matched.sort(compareSemver);
    if (sort === 'semver-desc') matched.reverse();
  } else {
    matched.sort();
    if (sort === 'desc') matched.reverse();
  }

  return matched;
};

const main = async () => {
  try {
    const token = core.getInput('token', { required: true, trimWhitespace: true });
    const regex = core.getInput('regex', { required: true });
    const flags = core.getInput('flags');
    const sort = normalizeSort(core.getInput('sort'));
    const paginate = core.getBooleanInput('paginate');
    const per_page = parseIntInRange('per_page', core.getInput('per_page'), { min: 1, max: 100 });
    const page = parseIntInRange('page', core.getInput('page'), { min: 1 });

    const contextRepo = github.context.repo;
    const owner = core.getInput('owner', { trimWhitespace: true }) || contextRepo.owner;
    const repo = core.getInput('repo', { trimWhitespace: true }) || contextRepo.repo;

    // Hide the token from logs even when callers pass it explicitly
    core.setSecret(token);

    new RegExp(regex, flags || ''); // fail fast on a bad pattern before any API call

    const octokit = github.getOctokit(token);

    let tags;
    if (paginate) {
      core.info(`Fetching all tags for ${owner}/${repo} (paginate=true, per_page=${per_page})`);
      tags = await octokit.paginate('GET /repos/{owner}/{repo}/tags', {
        owner,
        repo,
        per_page,
      });
    } else {
      core.info(`Fetching tags for ${owner}/${repo} (page=${page}, per_page=${per_page})`);
      const response = await octokit.request('GET /repos/{owner}/{repo}/tags', {
        owner,
        repo,
        per_page,
        page,
      });
      tags = response.data;
    }

    const filtered = filterAndSortTags(tags, regex, flags, sort);
    core.info(`Matched ${filtered.length} tag(s) of ${tags.length} fetched.`);

    try {
      await core.summary
        .addHeading('Filter tags')
        .addRaw(`Pattern: <code>/${regex}/${flags}</code>`, true)
        .addRaw(`Sort: <code>${sort}</code>`, true)
        .addRaw(`Fetched: <code>${tags.length}</code>, matched: <code>${filtered.length}</code>`, true)
        .addList(filtered)
        .write();
    } catch (summaryError) {
      core.debug(`Skipping job summary: ${summaryError.message}`);
    }

    core.setOutput('tags', filtered);
    core.setOutput('count', filtered.length);
  } catch (error) {
    core.setFailed(error.message);
  }
};

main();
