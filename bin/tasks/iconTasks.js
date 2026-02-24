'use strict';

const GulpIconTasks = require('../../func/gulp/classes/GulpIconTasks');
const logErr = require('../../func/utils/TimeLogger');

const moveBootstrapIcons = () => {

    try{

        const gulpIconTasks = new GulpIconTasks({ autoInit: false, watch: false,
            build: true, key: 'bootstrap'});
        gulpIconTasks.compileIconSets();

    }catch(err){
        logErr.writeLog(err , {customKey: 'Task Move Bootstrap icon failed'});
    }

    
} 

const moveFontawesomeIcons = () => {

    try{

        const gulpIconTasks = new GulpIconTasks({ autoInit: false, watch: false,
            build: true, key: 'fontawesome'});
        gulpIconTasks.compileIconSets();

    }catch(err){
        logErr.writeLog(err , {customKey: 'Task Move Font Option icon failed'});
    }

}

const compileIcons = () => {
    try{

        const gulpIconTasks = new GulpIconTasks({ autoInit: true , build : false
            , getHelp : true , command : "icons-compile"});
        gulpIconTasks.compileMultiDest();

    }catch(err){
        logErr.writeLog(err , {customKey: 'Task icon failed'});
    }

}

module.exports = { moveBootstrapIcons, moveFontawesomeIcons, compileIcons};
