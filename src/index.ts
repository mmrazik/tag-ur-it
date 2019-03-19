import { Application, Context } from 'probot' // eslint-disable-line no-unused-vars
import { GitHubAPI } from 'probot/lib/github';
import * as irm from './issuerules'

export = (app: Application) => {
  app.on('issues.opened', async (context: Context) => {
    console.log('---------------------');
    console.log("ISSUE OPENED");
    console.log('---------------------');
    try {
      console.log(context.issue());
      console.log(context.payload.issue.body);
  
      console.log('running rules ...');
      let fileInfo = context.issue({ path: 'issue-rules.yml'});
      let fileContents = await context.github.repos.getContents(fileInfo);
  
      if (fileContents) {
        // TODO: replace with Buffer.alloc
        let buff = new Buffer(fileContents.data.content, fileContents.data.encoding); 
        let issueRules: irm.IIssueRules = irm.parseYamlContents(buff.toString());
        let eng: irm.RuleEngine = new irm.RuleEngine();
      
        console.log("processing rules");
        let results: irm.ITagResults = eng.processRules(context.payload.issue.body, issueRules.rules);
        console.log('results:')
        console.log(results);

        if (results.labelsToAdd && results.labelsToAdd.length == 0) {
          results = eng.processRules(context.payload.issue.body, issueRules.noMatches);
          console.log('results:')
          console.log(results);        
        }
    
        eng.processTags(results.labelsToAdd, issueRules.tags); 
        console.log("tagsToAdd");
        console.log(results.labelsToAdd);   
    
        const labels = context.issue({labels:results.labelsToAdd});
        let res = await context.github.issues.addLabels(labels);

        if (results.assigneesToAdd && results.assigneesToAdd.length > 0) {
          const assignees = context.issue({assignees:results.assigneesToAdd});
          let assignRes = await context.github.issues.addAssignees(assignees);
        } 
      }
      else {
        console.log("no issue-rules.yml file");
      }

      const issueComment = context.issue({ body: 'Thanks for opening this issue!!' })
      await context.github.issues.createComment(issueComment)
    }
    catch (err) {
      console.error(err);
    }

  })
  // For more information on building apps:
  // https://probot.github.io/docs/

  // To get your app running against GitHub, see:
  // https://probot.github.io/docs/development/
}
