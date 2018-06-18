'use strict';

const config = require('./config/config');
const ClI =require('./config/lib/cli');

exports.Changelog = function(){
    if(ClI.unreleased) config.unreleased(ClI.args);
    if(ClI.release) config.release(ClI.args);
    if(ClI.mobile) config.mobile(ClI.args);
}();

