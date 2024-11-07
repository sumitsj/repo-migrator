#!/usr/bin/env node

import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config(); // Load environment variables from .env file

console.log( "Running PR migration..." );

// Configuration from environment variables
const {
    BITBUCKET_TOKEN,
    GITLAB_TOKEN,
    BITBUCKET_REPO,
    GITLAB_REPO_ID,
    BITBUCKET_API_URL = 'https://api.bitbucket.org/2.0',
    GITLAB_API_URL = 'https://gitlab.com/api/v4'
} = process.env;

// Helper function to print all environment variables with proper formatting
function printEnvVariables() {
    console.log('\n--- Environment Variables ---');
    const envs = [
        'BITBUCKET_TOKEN',
        'GITLAB_TOKEN',
        'BITBUCKET_REPO',
        'GITLAB_REPO_ID',
        'BITBUCKET_API_URL',
        'GITLAB_API_URL'
    ];

    envs.forEach((key) => {
        console.log(`${key}: ${process.env[key]}`);
    });

    console.log('-----------------------------\n');
}

// Helper function to fetch all Bitbucket pull requests with pagination
async function fetchAllBitbucketPullRequests() {
    let pullRequests = [];
    let url = `${BITBUCKET_API_URL}/repositories/${BITBUCKET_REPO}/pullrequests?pagelen=10`;

    while (url) {
        const response = await fetch(url, {
            headers: {
                Authorization: `Bearer ${BITBUCKET_TOKEN}`
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch Bitbucket pull requests: ${response.statusText}`);
        }

        const data = await response.json();
        pullRequests = pullRequests.concat(data.values);
        url = data.next || null; // Paginated API: go to the next page if available
    }

    return pullRequests;
}

// Helper function to check if a GitLab merge request exists with the same source and target branch
async function gitLabMergeRequestExists(sourceBranch, targetBranch) {
    const url = `${GITLAB_API_URL}/projects/${GITLAB_REPO_ID}/merge_requests?source_branch=${sourceBranch}&target_branch=${targetBranch}&state=all`;

    const response = await fetch(url, {
        headers: {
            Authorization: `Bearer ${GITLAB_TOKEN}`,
            'Content-Type': 'application/json'
        }
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch GitLab merge requests: ${response.statusText}`);
    }

    const data = await response.json();
    return data.length > 0; // If data contains any item, a similar MR already exists
}

// Helper function to create a new merge request in GitLab
async function createGitLabMergeRequest(pr) {
    const { title, description, source, destination } = pr;

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
        throw new Error(`Failed to create GitLab merge request: ${response.statusText}`);
    }

    const newMergeRequest = await response.json();
    console.log(`Created Merge Request in GitLab: ${newMergeRequest.web_url}`);
}

// Main function to copy all PRs from Bitbucket to GitLab if not already present
async function copyPullRequests() {
    try {
        console.log('Fetching all Bitbucket pull requests...');
        const pullRequests = await fetchAllBitbucketPullRequests();

        for (const pr of pullRequests) {
            const sourceBranch = pr.source.branch.name;
            const targetBranch = pr.destination.branch.name;

            // Check if the merge request already exists in GitLab
            const exists = await gitLabMergeRequestExists(sourceBranch, targetBranch);
            if (exists) {
                console.log(`Merge Request for ${sourceBranch} -> ${targetBranch} already exists in GitLab. Skipping...`);
                continue;
            }

            // Create a new merge request in GitLab
            console.log(`Copying PR: ${pr.title}`);
            await createGitLabMergeRequest(pr);
        }

        console.log('All pull requests have been copied successfully.');
    } catch (error) {
        console.error(`Error: ${error.message}`);
    }
}

printEnvVariables();
// Run the script
copyPullRequests();
