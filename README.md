To copy branches & pull requests from Bitbucket to GitLab, we need to:

1. **Fetch branches** from the Bitbucket repository.
2. **Create equivalent branches** in the GitLab repository.
3. **Fetch pull requests** from a Bitbucket repository.
4. **Create equivalent merge requests** in a GitLab repository.

This script adds branch copying functionality. It checks if the branches already exist in GitLab to avoid duplicate creation.

### Requirements
Make sure you have the necessary permissions:
1. Bitbucket App Password with repository access.
2. GitLab Personal Access Token with repository access.

### Setup

1. **Environment Variables Setup**:
    - **dotenv Configuration**: The script starts by requiring and configuring `dotenv` to load variables from the `.env` file into `process.env`.
    - **Destructuring Environment Variables**: The configuration variables are destructured from `process.env`, providing default values for API URLs if they are not set.

2. **Validation of Environment Variables**:
    - **`validateEnvVariables` Function**: Before executing any operations, the script checks whether all required environment variables are set. If any are missing, it throws an error, preventing the script from running with incomplete configurations.

3. **Security and Flexibility**:
    - **No Hard-Coded Credentials**: All sensitive information like usernames, passwords, and tokens are read from environment variables, enhancing security.
    - **Ease of Configuration**: Changing configurations doesn't require modifying the script; you simply update the environment variables.

4. **Optional API URLs**:
    - The script allows overriding default API URLs through environment variables if needed, providing flexibility for different Bitbucket or GitLab instances.


### Code Explanation

1. **`fetchBitbucketBranches`**: Retrieves all branches in the Bitbucket repository.
2. **`createGitLabBranch`**: Creates a branch in GitLab using the `branch` name and `ref` hash of the branch in Bitbucket. The `ref` points to the commit hash in Bitbucket.
3. **`fetchBitbucketPullRequests`**: Fetches all pull requests from Bitbucket.
4. **`createGitLabMergeRequest`**: Creates a merge request in GitLab with the `source_branch` and `target_branch` matching the Bitbucket PR.
5. **`copyBranchesAndPullRequests`**: Orchestrates the copying of branches and pull requests. It first copies branches to GitLab, then processes and copies each open pull request.


### Running the Script

1. **Ensure Dependencies are Installed**:

    ```bash
    npm install
    ```

2. **Set Up the `.env` File**: As shown above.

3. **Run the Script**:

    ```bash
    node .
    ```


### Important Notes

- **Branch Creation**: If the branch already exists in GitLab, it logs and skips creation to avoid errors.
- **Source and Target Branches in Pull Requests**: Ensure the branches in pull requests are valid and match in both repositories for a smooth transfer.
- **Permissions**: Ensure Bitbucket App Password and GitLab Token have sufficient permissions.
- **Rate Limits**: GitLab and Bitbucket API rate limits could impact large repositories with many branches or pull requests.

This updated script should now successfully copy branches as well as pull requests from Bitbucket to GitLab.