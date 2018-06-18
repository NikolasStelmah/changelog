const JiraClient = require('jira-connector');
const options = require('../env/options');

const curl = require( 'curl-request' );


exports.getCommitsData = async (issues) => {
  console.log('Jira issues', issues);

  const jira = await new curl().setHeaders([
    'accept: application/json',
    'Authorization: OAuth',
    'oauth_consumer_key="changelog"',
    'oauth_nonce="00a2993e54d94ba4bcf02007fd793773"',
    'oauth_signature_method="RSA-SHA1"',
    'oauth_timestamp="1526644380"',
    'oauth_token="q9dDtBMPczALQ5hQRMCcTisumtxXpHkd"',
    'oauth_version="1.0"',
    'oauth_signature="iaGBSXeGr2TgsvyCsKzXd6JwGqIMRQQehulVefQ%2Fly3mWoXSMw9IU3qi9ywLV6yqwLvpkHu8jiv4QDGM0QV22teU6vpnrBpOnyvCThQaUbZalD%2F1GP%2Bs5InJaxxnRs3Wct9psTW8llEkOnGG%2FhAV9%2FAm1DmTgiH13iks2xtR7uVirnpddBZSDzbeqp15q%2FVGJau3RZ0fE4tF8cdkkk2zupM7fuX2F1Q5vYLuq%2FFDH95D2yuf8OF5QthsSyBD0NIU32R%2Fh2obvVTYoL3OH8O6e0qerjed2%2FtCfmTU%2BnZ1pbXG3fFc2o5nRtvp7h%2BFenvof45AKK3dQaG78I4uMmw20w%3D%3D'
  ])
    .get('https://jira.meisterfit.com/rest/api/2/issue/MEIS-500')
    .then(({statusCode, body, headers}) => {
      console.log('AAAAAAAAAAAAAAAA')
      console.log(statusCode, body, headers)
    })
    .catch((e) => {
      console.log(e);
    });
  //const jira = await new JiraClient(options.jiraOAuth);

  console.log(JiraClient.prototype)
  console.log(curl.prototype)
  console.log('Jira is now authenticted with your account!');

  let arr = issues.map((issue) => jira.issue.getIssue({issueKey: issue.issueKey, expand: ['names']}));
  return Promise.all(arr)
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

