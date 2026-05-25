import * as core from '@actions/core';
import * as github from '@actions/github';

const main = async () => {
  try {
    const owner = core.getInput('owner');
    const repo = core.getInput('repo');
    const token = core.getInput('token');
    const per_page = core.getInput('per_page');
    const page = core.getInput('page');
    const regex = core.getInput('regex');
    const sort = core.getInput('sort');

    const octokit = github.getOctokit(token)

    const tags = await octokit.request('GET /repos/{owner}/{repo}/tags', {
      owner: owner,
      repo: repo,
      per_page: per_page,
      page: page,
    })

    let filtered_tags = tags.data.map(o => o.name).filter(name => name.match(regex))
    
    filtered_tags.sort() // asc
    if (sort === 'desc') {
      filtered_tags = filtered_tags.reverse()
    }

    core.setOutput("tags", filtered_tags);
  } catch (error) {
    core.setFailed(error.message);
  }
}

main()
