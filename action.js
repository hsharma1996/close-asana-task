const core = require('@actions/core');
const github = require('@actions/github');
const Asana = require('asana');

async function findAsanaTaskId(commitMessage) {
    // Assuming your commit message format is like "Fixes #TASK_ID"
    const match = commitMessage.match(/(?:fixed|fix|solved|close|closed|closes)\s*:? #(\d+)/i);
    return match ? match[1] : null;
}

async function closeAsanaTask(taskId) {
    try {
        let taskApiInstance = new Asana.TasksApi();
        let body = { "data": { "completed": true } }; // Object | The story to create.
        let task_gid = taskId; // String | The task to operate on.
        taskApiInstance.updateTask(body, task_gid).then((result) => {
            console.log('API called successfully');
        }, (error) => {
            console.error(error.response.body);
        });
        core.info(`Closed Asana Task: ${taskId}`);
    } catch (error) {
        core.error(`Error closing Asana Task: ${error}`);
    }
}

async function addCommentToAsanaTask(taskId, userName, branchName, repoName, commitUrl, commitMessage) {
    let storiesApiInstance = new Asana.StoriesApi();
    const commentText = `${userName} pushed to branch ${branchName} of ${repoName} (${commitUrl}): ${commitMessage}`;
    let body = { "data": { "text": commentText } }; // Object | The story to create.
    let task_gid = taskId; // String | The task to operate on.
    try {
        storiesApiInstance.createStoryForTask(body, task_gid).then((result) => {
            console.log('API called successfully.');
        }, (error) => {
            console.error(error.response.body);
        });
    } catch (error) {
        core.error(`Error adding comment to Asana Task: ${error}`);
    }
}
function buildClient(asanaPAT) {
    let client = Asana.ApiClient.instance;
    let token = client.authentications['token'];
    token.accessToken = asanaPAT;
}

async function getMyName() {
    let usersApiInstance = new Asana.UsersApi();
    let user_gid = "me"; // String | A string identifying a user. This can either be the string \"me\", an email, or the gid of a user.
    try {
        let data = await usersApiInstance.getUser(user_gid).catch(console.log);
        return data?.data?.name || "";
    } catch (error) {
        core.error(`Error getting user: ${error}`);
    }
}

async function main() {

    const ASANA_PAT = core.getInput('asana-pat', { required: true });
    const COMMIT_MESSAGE = github.context.payload.head_commit.message;
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

    buildClient(ASANA_PAT);

    const USER_NAME = await getMyName();

    // Step 3: Add comment to Asana task
    await addCommentToAsanaTask(taskId, USER_NAME, BRANCH_NAME, REPOSITORY_NAME, COMMIT_URL, COMMIT_MESSAGE);

    // Step 4: Use the ASANA_PAT to close the task on Asana
    await closeAsanaTask(taskId);


}

main().catch(error => {
    core.setFailed(`An unexpected error occurred: ${error}`);
});