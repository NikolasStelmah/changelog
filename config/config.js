'use strict';

const Bluebird = require('bluebird');
const Fs = require('fs');
const Git = require('./lib/git');
const Release = require('./lib/version');
const Writer = require('./lib/writer');
const Jira = require('./lib/jiraCommit');
const Mobile = require('./lib/whatsNewMobile');
const spawn = require('child_process').spawn;
const gitCommand = (command, args) => spawn(command, args);
const spawnAdd = (args, command) => {
  if (!command) command = 'git';
  const promise = new Promise((resolve, reject) => {
    let commit = gitCommand(command, args);
    commit.stdout.on('data', (data) => {
      console.log('stdout>>>>>', data.toString());
    });
    commit.stderr.on('data', (data) => {
      console.log('stdout>>>>>', data.toString());
    });
    commit.on('close', (code) => {
      if (code !== 0) {
        reject(`bad ${command} ${args[0]}`);
        console.log(`grep process exited with code ${code}`);
      } else resolve(`${command} ${args[0]} done`)
    })
  });
  promise.then((successMessage) => {
    console.log(successMessage);
  });
  promise.catch(function () {
    throw new Error(`${command} ${args[0]} false`)

  });
  return promise
};

const status =() =>{
  let promise = new Promise((resolve, reject) => {
    let commit = gitCommand('git', ['status']);
    const statusArr = [];
    commit.stdout.on('data', (data) => {
      statusArr.push(data);
    });
    commit.on('close', (code) => {
      if (code !== 0) {
        reject(`bad git status`);
        console.log(`grep process exited with code ${code}`);
      } else if (statusArr.toString().indexOf('git add') !== -1) {
        resolve({status: true, message: `git status done`})
      } else resolve({status: false, message: `no changes for commit`})
    });
  });
  promise.catch(function () {
    throw new Error(`git status false`)

  });
  return promise.then((res) => {
    console.log(res.message);
    if (res.status) {
      return spawnAdd(['add', '.'])
        .then(() => spawnAdd(['commit', '-m', "Unreleased version [skip ci]"]))
    } else return spawnAdd(['commit', '--allow-empty', '-m', "Changelog [skip ci]"])
  });
};

const setConfig = async (options) => {
  await spawnAdd(['checkout', `${options[0]}`]);
  await spawnAdd(['config', '--list']);
  await spawnAdd(['remote', 'set-url', 'origin', `git@bitbucket.org:kingmuffin/${process.env.npm_package_name}.git`]);
  await spawnAdd(['config', '--global', 'user.email', 'nikolai+changelog@kingmuffin.com']);
  await spawnAdd(['config', '--global', 'user.name', 'Changelog']);
  await spawnAdd(['config', '--list']);
  await spawnAdd(['pull']);
};
const createCommit = async (options, issues) => {
  try {
    await setConfig(options);
    const issuesData = await Jira.getCommitsData(issues);
    const commitsBody = await Jira.autoCommit(issues, issuesData);
    await spawnAdd(['status']);
    await Bluebird.mapSeries(commitsBody, (commitBody) => spawnAdd(['commit', '--allow-empty', `-m${commitBody}`]));
  } catch (err) {
    console.log(err);
    throw new Error(err);
  }
};

function writeChangelog(changelog) {
  const promise = new Promise((resolve, reject) => {
    Fs.writeFileSync('CHANGELOG.md', changelog);
    let exist = Fs.existsSync('CHANGELOG.md');
    if (exist) {
      resolve('Changelog exist')
    } else reject('Changelog does not exist')
  });
  promise.then((res) => console.log(res));
  promise.catch((err) => {
    throw new Error(err);
  });
  return promise
}

exports.unreleased = async (options) => {
  process.on('unhandledRejection', up => {
    throw up
  });
  try {
    const issues = await Git.getKeys();
    if(issues){
      await createCommit(options,issues);
      options[1] && options[1] === 'beta' &&  issues[0] && await Mobile.whatsNewFilter(issues);
      const commits = await Git.getCommits();
      const changelog = await Writer.markdown(null, commits);
      await writeChangelog(changelog);
      await status();
      await spawnAdd(['status']);
      await spawnAdd(['push']);
      await spawnAdd(['status']);
    } else console.log("This is not a pull request, there is no change for the Changelog")

  } catch (err) {
    console.log(err);
    throw new Error(err);
  }
};
exports.release = async (options) => {
  process.on ('unhandledRejection', up => { throw up});
  try {
    const commits = await Git.getCommits();
    const release = await Release.calculateNewVersion(commits);
    const changelog = await Writer.markdown(release, commits);
    await setConfig(options);
    await writeChangelog(changelog.content);
    await spawnAdd(['tag', `${changelog.tag}`]);
    await spawnAdd(['version', '--no-git-tag-version', `${changelog.tag}`], 'npm');
    await spawnAdd(['add', '.']);
    await spawnAdd(['commit', '-m', `${changelog.tag} [skip ci]`]);
    await spawnAdd(['status']);
    await spawnAdd(['push', '--tags']);
    await spawnAdd(['push']);
    await spawnAdd(['status']);
  } catch (err) {
    console.log(err);
    throw new Error(err);
  }
};

exports.mobile = (options) => Mobile.betaRelease(options);

