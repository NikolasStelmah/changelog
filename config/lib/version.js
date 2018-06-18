const Bluebird = require('bluebird');
const CP = Bluebird.promisifyAll(require('child_process'));


const Release=function (commits) {
    let level = 3;
    let type = null;
    commits.forEach(function (commit) {
        if (commit.notes && commit.notes.length > 0) {
            level = 0;
            type='major';
        } else if (commit.type === 'Feature' && level !== 0) {
            level = 1;
            type='minor';
        } else if ((commit.type === 'Bug' || commit.type === 'Improvement' || commit.type === 'SubTask') && level !== 0 && level !== 1) {
            level = 2;
            type='patch';
        }
    });
    return {
        level: level,
        type: type

    };
};

const tag=function (commits, version) {
    let result=Release(commits);
    let str;
    let v = 'v0.0.0';
    if (version) {
        v = version
    }

    switch (result.level) {
        case 0:
            str = 'v' + (+v[1] + 1) + '.' + 0 + '.' + 0;
            break;
        case 1:
            str = 'v' + v[1] + '.' + (+v[3] + 1) + '.' + 0;
            break;
        case 2:
            str = 'v' + v[1] + '.' + v[3] + '.' + (+v[5] + 1);
            break;
        case 3:
            console.log(`Your version ${v} does not need to be updated`);
            break;

        default:
            console.log('exec error: ' + error);
    }
  console.log(str);
    return {version:str,
        type:result.type
    }
};

exports.calculateNewVersion = function (commits) {

    return new Bluebird(function (resolve) {

        return resolve(CP.execAsync('git describe --tags --abbrev=0'));
    }).catch(function (err) {
        return ''
    }).then(function (result) {
            return tag(commits,result)
        })

};
