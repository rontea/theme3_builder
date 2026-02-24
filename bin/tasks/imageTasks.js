'use strict';
const GulpImageTasks = require('../../func/gulp/classes/GulpImageTasks');
const logErr = require('../../func/utils/TimeLogger');

const buildImages = () => {

    try{
        const gulpImageTasks = new GulpImageTasks({ watch: false});
        gulpImageTasks.compileImagesSync();
    }catch(err){
        logErr.writeLog(err , {customKey: 'Task Image compile failed'});
    }

};

const watchImages = () => {

    try{
        const gulpImageTasks = new GulpImageTasks({ watch: true});
        gulpImageTasks.watchImagesSync();
    }catch(err){
        logErr.writeLog(err , {customKey: 'Task watch failed'});
    }

}

module.exports = { buildImages, watchImages };