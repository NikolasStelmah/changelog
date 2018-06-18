const fs = require('fs');
const path = require('path');
const Bluebird = require('bluebird');
const changeLogFile = '../../CHANGELOG.md';
const appfile = '../../app.json';
const divider = '-------------';
const androidFile = './metadata/android/en-US/changelogs/';
const androidBuildPath = '../app/build.gradle';

exports.betaRelease = function (options) {
  let app = JSON.parse(fs.readFileSync(appfile, 'utf8'));
  let whatsNewOld = options[0] === "ios" && app.whatsNewOld.ios || options[0] === "android" && app.whatsNewOld.android || [];
  let changelog = fs.readFileSync(changeLogFile, 'utf8');
  let unreleased = changelog.split(divider)[0];
  let issueKey = [];
  let result = '';
  let androidVersionCode='default';
  if (unreleased.indexOf('#### Unreleased') !== -1) {
    let sections = unreleased.split('#####');
    sections.shift();
    const newSections = sections.map((section) => {
      let lines = section.split('\n');
      let newLines = lines.filter((line) => {
        let parsed = line.match(/\[(\w*-\w*)\]/);
        parsed && issueKey.push(parsed[1]);
        if (whatsNewOld.length > 0) {
          if (!whatsNewOld.some((key) => line.indexOf(key) !== -1)) {
            return line
          }
        } else return line
      });
      newLines[0] = ('## ' + newLines[0]);
      if (newLines[1]) return newLines.join('\n')
    });
    result = newSections.filter((section) => section && section).join('\n\n').replace(/(\(|Parent:)\[.+?\)(\)|)/g, '').replace(/\*/g, '-');
  }
  if(options[0] === "android"){
    let androidBuild = fs.readFileSync(androidBuildPath, 'utf8');
    let search =androidBuild.match( /versionCode (\d+)\n/m );
    androidVersionCode=search[1];

    const pathToCreate = androidFile;
    pathToCreate
      .split(path.sep)
      .reduce((currentPath, folder) => {
        currentPath += folder + path.sep;
        if (!fs.existsSync(currentPath)){
          fs.mkdirSync(currentPath);
        }
        return currentPath;
      }, '');
  }
  options[0] === "ios" && console.log(result);
  options[0] === "android" && fs.writeFileSync(androidFile + androidVersionCode + '.txt', result, 'utf8');
  app.whatsNewOld[options[0]] = issueKey;
  fs.writeFileSync(appfile, JSON.stringify(app, null, 2), 'utf8');
};

exports.whatsNewFilter = function (issues) {
  return new Bluebird(function (resolve) {
    let app = JSON.parse(fs.readFileSync('app.json', 'utf8'));
    let ios = app.whatsNewOld.ios.filter((key) => issues.some((issue) => key !== issue.issueKey));
    let android = app.whatsNewOld.android.filter((key) => issues.some((issue) => key !== issue.issueKey));
    app.whatsNewOld.ios = ios;
    app.whatsNewOld.android = android;
    fs.writeFileSync('app.json', JSON.stringify(app, null, 2), 'utf8');
    return resolve({whatsNewOld: app.whatsNewOld, message: 'Update whatsNewOld'});
  })
    .catch(function (err) {
      throw new Error(err);
    })
    .then(function (res) {

      console.log(`${res.message}:${res.whatsNewOld}`);
      return res.whatsNewOld
    })
};
