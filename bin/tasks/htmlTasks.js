'use strict';
const logErr = require('../../func/utils/TimeLogger');

const GulpHTMLTasks = require('../../func/gulp/classes/GulpHTMLTasks');

const buildHtml = () => {

    try{

        const gulpHtmlTasks = new GulpHTMLTasks({ watch: false});
        gulpHtmlTasks.compileHtmlSync(); 

    }catch(err){
        logErr.writeLog(err , {customKey: 'Task build HTML failed'});
    }
};

const watchHtml = () => {

    try{

        const gulpHtmlTasks = new GulpHTMLTasks({ watch: true});
        gulpHtmlTasks.watchHtmlSync();

    }catch(err){
        logErr.writeLog(err , {customKey: 'Task watch HTML failed'});
    }
    
};

module.exports = { buildHtml , watchHtml };
