const core = require('@actions/core');
const github = require('@actions/github');
const asana = require('asana');

async function findAsanaTaskId(commitMessage) {
    // Assuming your commit message format is like "Fixes #TASK_ID"
    console.log(`Commit Message: ${commitMessage}`);
    const match = commitMessage.match(/(?:fixed|fix|solved|close|closed|closes) #(\d+)/i);
    return match ? match[1] : null;
}

async function closeAsanaTask(client, taskId) {
    try {
        await client.tasks.update(taskId, {
            completed: true
        });
        core.info(`Closed Asana Task: ${taskId}`);
    } catch (error) {
        core.error(`Error closing Asana Task: ${error}`);
    }
}

async function addCommentToAsanaTask(client, taskId, userName, branchName, repoName, commitUrl, commitMessage) {
    const commentText = `${userName} pushed to branch ${branchName} of ${repoName} (${commitUrl}): ${commitMessage}`;
    try {
        await client.tasks.addComment(taskId, {
            text: commentText
        });
        core.info(`Added comment to Asana Task ${taskId}: ${commentText}`);
    } catch (error) {
        core.error(`Error adding comment to Asana Task: ${error}`);
    }
}

async function main() {
    const ASANA_PAT = core.getInput('asana-pat', { required: true });
    const COMMIT_MESSAGE = github.context.payload.head_commit.message;
    const USER_NAME = github.context.actor;
    const BRANCH_NAME = github.context.ref.split('/').pop();
    const REPOSITORY_NAME = github.context.repo.repo;
    const COMMIT_URL = github.context.payload.head_commit.url;

    // Step 1: Check if the user has ASANA_PAT in secrets
    if (!ASANA_PAT) {
        core.info('ASANA_PAT not found. Exiting...');
        return;
    }

    // Step 2: Check if the commit message contains a supported keyword for closing an issue
    const taskId = await findAsanaTaskId(COMMIT_MESSAGE);
    if (!taskId) {
        core.info('No Asana task ID found in commit message. Exiting...');
        return;
    }

    // Step 3: Use the ASANA_PAT to close the task on Asana
    const client = await asana.Client.create({
        defaultHeaders: { 'asana-enable': 'new-sections,string_ids' },
        logAsanaChangeWarnings: false
    }).useAccessToken(ASANA_PAT).authorize();

    await closeAsanaTask(client, taskId);

    // Step 4: Add comment to Asana task
    await addCommentToAsanaTask(client, taskId, USER_NAME, BRANCH_NAME, REPOSITORY_NAME, COMMIT_URL, COMMIT_MESSAGE);
}

main().catch(error => {
    core.setFailed(`An unexpected error occurred: ${error}`);
});
