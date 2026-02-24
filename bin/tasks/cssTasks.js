'use strict';

const GulpCSSTaskManager = require('../../func/gulp/classes/GulpCSSTaskManager');
const logErr = require('../../func/utils/TimeLogger');

const compileCss = () => {

    try {
        const gulpCSSTaskManager = new GulpCSSTaskManager({ autoInit: true , 
            watch: false, getHelp : true , command : "css-compile" });
        gulpCSSTaskManager.compileCssSync();
    }catch(err) {
        logErr.writeLog(err , {customKey: 'Task CSS compile failed'});
    }
   
};

const buildCss = () => {

    try{
        const gulpCSSTaskManager = new GulpCSSTaskManager({ 
            autoInit: false, build: true, key: 'css' });
        gulpCSSTaskManager.compileCssSync();
    }catch(err) {
        logErr.writeLog(err , {customKey: 'Task CSS build failed'});
    }

}

const buildScss = () => {

    try{
        const gulpCSSTaskManager = new GulpCSSTaskManager({ 
            autoInit: false, watch:false, build: true, key: 'scss' });
        gulpCSSTaskManager.compileCssSync();
    }catch(err) {
        logErr.writeLog(err , {customKey: 'Task CSS build scss'});
    }


}

const buildFontawesomeCss = () => {

    try {
        const gulpCSSTaskManager = new GulpCSSTaskManager({ 
            autoInit: false, build: true, key: 'fontawesome' });
        gulpCSSTaskManager.compileCssSync(); 
    }catch(err) {
        logErr.writeLog(err , {customKey: 'Task fontawesome build scss'});
    }

}

const buildBootstrapIconsCss = () => {

    try {
        const gulpCSSTaskManager = new GulpCSSTaskManager({ 
            autoInit: false, build: true, key: 'bootstrapIcon'  });
        gulpCSSTaskManager.compileCssSync(); 
    }catch(err) {
        logErr.writeLog(err , {customKey: 'customValue'});
    }

}

const watchCss = () => {
    try {
        const gulpCSSTaskManager = new GulpCSSTaskManager({ autoInit: false , build: true});
        gulpCSSTaskManager.watchCSS();
    }catch(err) {
        logErr.writeLog(err , {customKey: 'customValue'});
    }

}

module.exports = { compileCss , buildCss, buildScss , buildFontawesomeCss
    , buildBootstrapIconsCss , watchCss };