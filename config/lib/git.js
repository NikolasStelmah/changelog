'use strict';

const Bluebird = require('bluebird');
const CP       = Bluebird.promisifyAll(require('child_process'));
const fs = require('fs');
const SEPARATOR      = '===END===';
const COMMIT_PATTERN = /^(\w*)(\(([\w\$\.\-\* ]*)\))?\: (.*)$/;
const FORMAT         = '%H%n%s%n%b%n' + SEPARATOR;

exports.getCommits = function () {
  return new Bluebird(function (resolve) {
    return resolve(CP.execAsync('git describe --tags --abbrev=0'));
  })
    .catch(function () {
      return '';
    })
    .then(function (tag) {
      tag = tag.toString().trim();
      let revisions;

      if (tag.indexOf('..') !== -1) {
        revisions = tag;
      } else {
        revisions = tag ? tag + '..HEAD' : '';
      }

      return CP.execAsync(
        'git log -E --format=' + FORMAT + ' ' + revisions,
        {
          maxBuffer: Number.MAX_SAFE_INTEGER
        }
      );
    })
    .catch(function () {
      throw new Error('no commits found');
    })
    .then(function (commits) {
      return commits.split('\n' + SEPARATOR + '\n');
    })
    .map(function (raw) {
      if (!raw) {
        return null;
      }

      let lines = raw.split('\n');
      let commit = {};
      commit.hash = lines.shift();
      commit.subject = lines.shift();
      commit.body = lines.shift();
      commit.parent = lines.shift();
      commit.notes = lines.shift();
      let parsed = commit.subject.match(COMMIT_PATTERN);

      if (!parsed || !parsed[1] || !parsed[4]) {
        return null;
      }

      commit.type = parsed[1];
      commit.category = parsed[3] || '';
      commit.subject = parsed[4];
      return commit;
    })
    .filter(function (commit) {
      if (!commit) {
        return false;
      }
      return  commit.type==='Feature'||commit.type==='Bug'||commit.type==='Improvement'||commit.type==='SubTask';
    })
};

exports.getKeys = function () {
  return new Bluebird(function (resolve) {
    return resolve(CP.execAsync('git log -1'));
  })
    .then(function (raw) {
      let issues = [];
      let result = [];
      if(!(raw.indexOf('Merged') !== -1) && !(raw.indexOf('pull request #') !== -1) )return false;
      raw.replace(/(MEIS-\w*)/g, (str, p) => {
        issues.push({issueKey: p});
        return p
      });
      raw.replace(/#major\((.+?)\)/g, (str, p) => {
        issues[0].major = p;
        return str
      });

      issues.map((obj, i) => {
        if (i > 0) {
          if (result.some((issue) => issue.issueKey !== obj.issueKey)) result.push(obj)
        } else result.push(obj)

      });
      return result
    }).catch(function (err) {
      console.log("IssueKey error:", err);
      throw new Error('IssueKey error');
    })
};
