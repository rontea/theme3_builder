'use strict';

const GulpJSTaskManager = require('../../func/gulp/classes/GulpJSTaskManager');
const logErr = require('../../func/utils/TimeLogger');

const compileJs = () => {

    try {

        const gulpJSTaskManager = new GulpJSTaskManager({ autoInit: true, watch: false 
            ,  getHelp : true , command : "js-compile" });
        gulpJSTaskManager.compileJsSync();

    }catch(err){
        logErr.writeLog(err , {customKey: 'Task JS compile failed'});
    }


};

const buildJs = () => {

    try{

        const gulpJSTaskManager = new GulpJSTaskManager({ autoInit: false , watch : false 
            , build: true, key: 'js'});
        gulpJSTaskManager.compileJsSync();

    }catch(err){
        logErr.writeLog(err , {customKey: 'Task CSS build failed'});
    }

};

const buildJsFontawesome = () => {

    try{

        const gulpJSTaskManager = new GulpJSTaskManager({ autoInit: false , 
            watch: false, build: true, key: 'fontawesome'});
        gulpJSTaskManager.compileJsSync();

    }catch(err){
        logErr.writeLog(err , {customKey: 'Task JS Fontawesome build failed'});
    }

   
}

const watchJs = () => {

    try{
        
        const gulpJSTaskManager = new GulpJSTaskManager({ autoInit: false , watch: true});
        gulpJSTaskManager.watchJsSync();

    }catch(err){
        logErr.writeLog(err , {customKey: 'Task JS watch failed'});
    }

};

module.exports = { compileJs , buildJs , buildJsFontawesome , watchJs };