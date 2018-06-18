'use strict';
const fs = require('fs');
const Bluebird = require('bluebird');

const DEFAULT_TYPE = 'other';
const TYPES = {
  Feature: 'New Features',
  Bug: 'Bug Fixes',
  other: 'Other Changes',
  Improvement: 'Improvements',
  SubTask: 'Sub Tasks'
};
const divider = '-------------';
const changeLogFile = 'CHANGELOG.md';


function getChangeLog(){
  if (!fs.existsSync(changeLogFile)) {
      fs.writeFileSync(changeLogFile, '', 'utf8');
    return fs.readFileSync(changeLogFile, 'utf8');
  }
  return fs.readFileSync(changeLogFile, 'utf8');
}


exports.markdown = function (release, commits) {
  let filterCommits = [];
    commits.map(function (commit, i) {
        if (i === 0) {
            filterCommits.push(commit)
        } else if (!filterCommits.some(function (elem) {
                return commit.subject === elem.subject
            })) {
            filterCommits.push(commit)
        }
    });
  let oldChangelog = getChangeLog();
  let oldChangelogArr = oldChangelog.split(divider);

  let content = [];
    if (filterCommits.length>0) {
      content.push('# CHANGELOG\n');
      let date = new Date().toJSON().slice(0, 10);
      let heading;

        if (release && release.type === 'major') {
            heading = '## ';
        } else if (release && release.type === 'minor') {
            heading = '### ';
        } else {
            heading = '#### ';
        }

        if (release && release.version) {
            heading += ' ' + release.version + ' (' + date + ')';
        } else {
            heading += 'Unreleased ' + ' (' + date + ')';
        }

        content.push(heading);
        content.push('');
    }
  return Bluebird.resolve(filterCommits)
  .bind({ types: {} })
  .each(function (commit) {
    let type = TYPES[commit.type] ? commit.type : DEFAULT_TYPE;
    let category = commit.category;

    this.types[type] = this.types[type] || {};
    this.types[type][category] = this.types[type][category] || [];

    this.types[type][category].push(commit);
  })
  .then(function () {
    return Object.keys(this.types).sort();
  })
  .each(function (type) {
    let types = this.types;

    content.push('##### ' + TYPES[type]);
    content.push('');

    Object.keys(this.types[type]).forEach(function (category) {
      let prefix = '*';
      let nested = types[type][category].length > 1;
      let categoryHeading = prefix + (category ? ' **' + category + ':**' : '');

      if (nested && category) {
        content.push(categoryHeading);
        prefix = '  *';
      } else {
        prefix = categoryHeading;
      }

      types[type][category].forEach(function (commit) {
        let shorthash = commit.hash.substring(0, 8);

          shorthash = '[' + commit.subject + '](' +'https://jira.meisterfit.com/browse/'+ commit.subject + ')';
        let parent = commit.type === 'SubTask' ? '  Parent:' + '[' + commit.parent + '](' + 'https://jira.meisterfit.com/browse/' + commit.parent + ')' : '';
        let major = commit.notes ? '   BREAKING CHANGES:' + commit.notes : '';
        content.push(prefix + ' ' + commit.body + ' (' + shorthash + ')' + parent + major);
      });
    });

    content.push('');
  })
  .then(function () {
    if(oldChangelogArr[1]){
        release ? content.push('\n') : content.push(divider);
         content.push(oldChangelogArr[1].replace(/^\n*/,''));
    }else if(oldChangelog.indexOf('#### Unreleased')===-1) {
      oldChangelog.length>0 && content.push(divider)&&content.push(oldChangelog.replace(/^# CHANGELOG\n*/,''));
    }
    console.log('Content writer true');
      if (release) {
          return {content: content.join('\n'), tag: release.version};
      }
    return content.join('\n');
  });
};
