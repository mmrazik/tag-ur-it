import { Application, Context } from 'probot' // eslint-disable-line no-unused-vars
import { GitHubAPI } from 'probot/lib/github';
import * as irm from './issuerules'

export = (app: Application) => {
  app.on('issues.opened', async (context: Context) => {
    console.log(context.payload.issue.url);

    let fileContents = null;
    try {
      let fileInfo = context.issue({ path: 'issue-rules.yml'});
      fileContents = await context.github.repos.getContents(fileInfo);
    }
    catch (err) {
      console.log("issue-rules.yml does not exist");
    }

    try {
      if (!fileContents) {
        return;
      }

      // TODO: replace with Buffer.alloc
      let buff = new Buffer(fileContents.data.content, fileContents.data.encoding); 
      let issueRules: irm.IIssueRules = irm.parseYamlContents(buff.toString());
      let eng: irm.RuleEngine = new irm.RuleEngine();
    
      let results: irm.ITagResults = eng.processRules(context.payload.issue.body, issueRules.rules);

      if (results.labelsToAdd && results.labelsToAdd.length == 0) {
        results = eng.processRules(context.payload.issue.body, issueRules.noMatches);
      }
  
      eng.processTags(results.labelsToAdd, issueRules.tags); 
      
      const labels = context.issue({labels:results.labelsToAdd});
      let res = await context.github.issues.addLabels(labels);

      if (results.assigneesToAdd && results.assigneesToAdd.length > 0) {
        const assignees = context.issue({assignees:results.assigneesToAdd});
        let assignRes = await context.github.issues.addAssignees(assignees);
      } 

      // this is too noisy for emails
      // TODO: add this as a config option to issue-rules.yml
      // const issueComment = context.issue({ body: 'Thanks for opening this issue!!' })
      // await context.github.issues.createComment(issueComment)
    }
    catch (err) {
      // TODO: figure out a good tracing / logging story
    }

  })
  // For more information on building apps:
  // https://probot.github.io/docs/

  // To get your app running against GitHub, see:
  // https://probot.github.io/docs/development/
}
