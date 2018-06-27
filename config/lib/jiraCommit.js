const options = require('../env/options');

const OAuth = require('oauth');


exports.getCommitsData = async (issues) => {
  console.log('Jira issues', issues);

  return await Promise.all(issues.map( async (issue) => {
    const url = `https://${options.jiraOAuth.host}/rest/api/2/issue/${issue.issueKey}?expand=names`;

    const oa = new OAuth.OAuth(
      'https://jira.meisterfit.com/plugins/servlet/oauth/request-token',
      'https://jira.meisterfit.com/plugins/servlet/oauth/access-token',
      options.jiraOAuth.oauth.consumer_key,
      options.jiraOAuth.oauth.private_key,
      '1.0',
      null,
      'RSA-SHA1',
      null,
      { accept: 'application/json' }
    );

    return await new Promise((resolve, reject) => {
      oa.get(url, options.jiraOAuth.oauth.token, options.jiraOAuth.oauth.token_secret,  function (error, data, response) {
        if (error) {
          console.log(`Cannot get ${issue.issueKey} issue data`)
          return reject(error)
        }
        return resolve(JSON.parse(data))
      });
    })
  }));
};


exports.autoCommit = async (issues,issuesData) => {
  console.log("Jira commit issuesData:",issuesData);
  let commitArr = issuesData.map((issueData) => {
    let type = issueData.fields.issuetype.name;

    if (type === 'New feature') {
      type = 'Feature'
    }
    if (type === 'Sub-task') {
      type = 'SubTask'
    }
    let subTask = type === 'SubTask' ? `\n${issueData.fields.parent.key}` : '\n';
    let major = issues[0].major && issueData.key === issues[0].issueKey ? `\n${issues[0].major}` : '';
    let commit = `${type}: ${issueData.key} \n\n ${issueData.fields.summary}${subTask}${major}`;
    console.log("Jira commit true");
    return commit
  });
  return Promise.all(commitArr)
};

