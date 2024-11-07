#!/usr/bin/env node

import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config(); // Load environment variables from .env file

console.log( "Started..." );

// Configuration variables from environment variables
const {
  BITBUCKET_USERNAME,
  BITBUCKET_APP_PASSWORD,
  GITLAB_TOKEN,
  BITBUCKET_REPO,
  GITLAB_REPO_ID,
  BITBUCKET_API_URL = 'https://api.bitbucket.org/2.0',
  GITLAB_API_URL = 'https://gitlab.com/api/v4'
} = process.env;

// Validate required environment variables
function validateEnvVariables() {
  const requiredVars = [
    'BITBUCKET_USERNAME',
    'BITBUCKET_APP_PASSWORD',
    'GITLAB_TOKEN',
    'BITBUCKET_REPO',
    'GITLAB_REPO_ID'
  ];

  const missingVars = requiredVars.filter((varName) => !process.env[varName]);

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(', ')}`
    );
  }
}

// Helper function to fetch branches from Bitbucket
async function fetchBitbucketBranches() {
  const response = await fetch(`${BITBUCKET_API_URL}/repositories/${BITBUCKET_REPO}/refs/branches`, {
    headers: {
      Authorization:
        'Basic ' +
        Buffer.from(`${BITBUCKET_USERNAME}:${BITBUCKET_APP_PASSWORD}`).toString('base64')
    }
  });

  if (!response.ok) {
    throw new Error(`Error fetching Bitbucket branches: ${response.statusText}`);
  }

  return response.json();
}

async function fetchAllBitbucketBranches() {
  let branches = [];
  let url = `${BITBUCKET_API_URL}/repositories/${BITBUCKET_REPO}/refs/branches`;

  while (url) {
    const response = await fetch(url, {
      headers: {
        Authorization:
          'Basic ' +
          Buffer.from(`${BITBUCKET_USERNAME}:${BITBUCKET_APP_PASSWORD}`).toString('base64')
      }
    });

    if (!response.ok) {
      throw new Error(`Error fetching Bitbucket branches: ${response.statusText}`);
    }

    const data = await response.json();
    branches = branches.concat(data.values);

    url = data.next || null;
  }

  return branches;
}

// Helper function to create a branch in GitLab
async function createGitLabBranch(branchName, branchTarget) {
  const requestBody = {
    branch: branchName,
    ref: branchTarget
  };

  const response = await fetch(`${GITLAB_API_URL}/projects/${GITLAB_REPO_ID}/repository/branches`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${GITLAB_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    // If branch already exists, skip creation and log
    if (response.status === 400) {
      console.log(`Branch ${branchName} already exists in GitLab.`);
      return;
    }
    throw new Error(`Error creating GitLab branch: ${response.statusText}`);
  }

  console.log(`Branch ${branchName} created in GitLab.`);
}

// Helper function to fetch pull requests from Bitbucket
async function fetchBitbucketPullRequests() {
  const response = await fetch(`${BITBUCKET_API_URL}/repositories/${BITBUCKET_REPO}/pullrequests`, {
    headers: {
      Authorization:
        'Basic ' +
        Buffer.from(`${BITBUCKET_USERNAME}:${BITBUCKET_APP_PASSWORD}`).toString('base64')
    }
  });

  if (!response.ok) {
    throw new Error(`Error fetching Bitbucket pull requests: ${response.statusText}`);
  }

  return response.json();
}

// Helper function to create a new merge request in GitLab
async function createGitLabMergeRequest(pullRequest) {
  const { title, description, source, destination } = pullRequest;

  const requestBody = {
    title,
    description,
    source_branch: source.branch.name,
    target_branch: destination.branch.name,
    remove_source_branch: false,
    squash: false
  };

  const response = await fetch(`${GITLAB_API_URL}/projects/${GITLAB_REPO_ID}/merge_requests`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${GITLAB_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    throw new Error(`Error creating GitLab merge request: ${response.statusText}`);
  }

  return response.json();
}

// Main function to copy branches and pull requests from Bitbucket to GitLab
async function copyBranchesAndPullRequests() {
  try {
    // Validate environment variables
    validateEnvVariables();

    // Step 1: Copy branches from Bitbucket to GitLab
    const bitbucketBranches = await fetchBitbucketBranches();
    for (const branch of bitbucketBranches.values) {
      console.log(`Copying Branch: ${branch.name}`);
      await createGitLabBranch(branch.name, branch.target.hash);
    }

    // Step 2: Copy pull requests from Bitbucket to GitLab
    const bitbucketData = await fetchBitbucketPullRequests();
    for (const pr of bitbucketData.values) {
      console.log(`Copying PR: ${pr.title}`);
      const newMR = await createGitLabMergeRequest(pr);
      console.log(`New Merge Request created in GitLab: ${newMR.web_url}`);
    }

    console.log('All branches and pull requests have been copied successfully.');
  } catch (error) {
    console.error(`Error: ${error.message}`);
  }
}

// Run the script
copyBranchesAndPullRequests();


console.log( "Ended..." );