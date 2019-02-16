import { Application } from 'probot' // eslint-disable-line no-unused-vars

export = (app: Application) => {
  app.on('issues.opened', async (context) => {
    console.log(context.issue());
    console.log(context.payload.issue.body);

    const labels = context.issue({labels:['bug', 'enhancement']});
    const res = await context.github.issues.addLabels(labels);
    console.log('added label', res);
    
    const issueComment = context.issue({ body: 'Thanks for opening this issue!!' })
    await context.github.issues.createComment(issueComment)
  })
  // For more information on building apps:
  // https://probot.github.io/docs/

  // To get your app running against GitHub, see:
  // https://probot.github.io/docs/development/
}
