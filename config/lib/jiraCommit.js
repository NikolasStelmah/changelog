const options = require('../env/options');

const curl = require('curl-request');
const oauth = require('oauth-sign');
const uuid = require('uuid');
const qs = require('querystring');
//const base64 = require('base-64');
const OAuth1 = require('oauth');


exports.getCommitsData = async (issues) => {
  console.log('Jira issues', issues);

  //let arr = issues.map((issue) => jira.issue.getIssue({issueKey: issue.issueKey, expand: ['names']}));
  let arr = await Promise.all(issues.map( async (issue) => {
    const oauth_timestamp = Math.floor(Date.now()/1000).toString();
    const oauth_nonce = uuid().replace(/-/g, '');
    const url = `https://jira.meisterfit.com/rest/api/2/issue/${issue.issueKey}`;

    const params = {
      oauth_consumer_key: options.jiraOAuth.oauth.consumer_key,
      oauth_nonce: oauth_nonce,
      oauth_signature_method: "RSA-SHA1",
      oauth_token: options.jiraOAuth.oauth.token,
      oauth_timestamp: oauth_timestamp,
      oauth_version: "1.0"
    }

    let oauth = await new OAuth1.OAuth(
      'https://jira.meisterfit.com/plugins/servlet/oauth/request-token',
      'https://jira.meisterfit.com/plugins/servlet/oauth/access-token',
      options.jiraOAuth.oauth.consumer_key,
      options.jiraOAuth.oauth.private_key,
      '1.0',
      null,
      'RSA-SHA1'
    );
    oauth.get(
      url,
      options.jiraOAuth.oauth.token, //test user token
      options.jiraOAuth.oauth.token_secret, //test user secret
      function (e, data, res){
        if (e) console.error(e);
        console.log('UUUUUUUUUUUUUUUUUUUUUUUUUUUUUU')
        console.log(data)
        console.log(res)
        console.log(require('util').inspect(data));
        done();
      });

    const oauth_signature = oauth.sign(
      'RSA-SHA1',
      'GET',
      url, //baseurl,
      params,
      options.jiraOAuth.oauth.private_key, //consumer_secret_or_private_key
      options.jiraOAuth.oauth.token_secret //token_secret
    )

    const encoded_oauth_signature = qs.escape(oauth_signature);
    //const encoded_oauth_signature = base64.encode(oauth_signature);

    console.log(`OAuth oauth_consumer_key="${options.jiraOAuth.oauth.consumer_key}",oauth_nonce="${params.oauth_nonce}",oauth_signature_method="RSA-SHA1",oauth_timestamp="${params.oauth_timestamp}",oauth_token="${options.jiraOAuth.oauth.token}",oauth_version="1.0",oauth_signature="${encoded_oauth_signature}"`)


    return await new curl().setHeaders([
      'accept: application/json',
      `Authorization: OAuth oauth_consumer_key="${options.jiraOAuth.oauth.consumer_key}",oauth_nonce="${params.oauth_nonce}",oauth_signature_method="RSA-SHA1",oauth_timestamp="${params.oauth_timestamp}",oauth_token="${options.jiraOAuth.oauth.token}",oauth_version="1.0",oauth_signature="${encoded_oauth_signature}"`
    ])
      .get(url)
      .then(({statusCode, body, headers}) => {
        console.log('jira get isuue SUCCEED')
        console.log(statusCode, body, headers)
      })
      .catch((e) => {
        console.log('tyt')
        console.log(e);
      });
  }));
  return arr
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

