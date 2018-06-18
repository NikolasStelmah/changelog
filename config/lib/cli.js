const CLI = require('commander');
module.exports = CLI
    .option('-u, --unreleased', 'create a unreleased version changelog')
    .option('-r, --release', 'create a release version changelog')
    .option('-m, --mobile', 'create a unreleased version for mobile')
    .parse(process.argv);
