'use strict';

const { parallel , series } = require('gulp');
const GulpJSTaskManager = require('./func/gulp/classes/GulpJSTaskManager');
const GulpCSSTaskManager = require('./func/gulp/classes/GulpCSSTaskManager');
const GulpHTMLTasks = require('./func/gulp/classes/GulpHTMLTasks');
const GulpImageTasks = require('./func/gulp/classes/GulpImageTasks');
const utils = require('./func/gulp/classes/Utils');
const gulpKeyCheck = require('./func/gulp/classes/GulpKeyCheck');
const GulpIconTasks = require('./func/gulp/classes/GulpIconTasks');
const GulpResourceHandler = require('./func/gulp/classes/GulpResourceHandler');


/** Utils Tasks */

exports.default = utils.defaultSync.bind();

exports.check = utils.helloSync.bind();

exports.clean = utils.utilsCleanSync.bind();

/** Manually Check Keys */
exports.keyCheck = (cb) => {
    gulpKeyCheck.checkJSKeySync();
    gulpKeyCheck.checkCSSKeySync();
    cb();
}

/** will need to move to options */
exports.keyJS = (cb) => {
    gulpKeyCheck.checkJSKeySync();
}

exports.KeyCSS = (cb) => {
    gulpKeyCheck.checkCSSKeySync();
}



/** CSS Tasks */
exports.compileCSS = (cb) => {
     /** Compile with options */
    const gulpCSSTaskManager = new GulpCSSTaskManager({ autoInit: true , 
        watch: false });
    gulpCSSTaskManager.compileCssSync();
    
    cb();
}

/** CSS Build Task */
exports.buildCSS = () => {
    const gulpCSSTaskManager = new GulpCSSTaskManager({ 
        autoInit: false, build: true, key: 'css' });

    return gulpCSSTaskManager.compileCssSync();
}

exports.buildSCSS = () => {
    const gulpCSSTaskManager = new GulpCSSTaskManager({ 
        autoInit: false, watch:false, build: true, key: 'scss' });

    return gulpCSSTaskManager.compileCssSync();
}

/** CSS and SCSS Watch */
exports.watchCSS = () => {
    const gulpCSSTaskManager = new GulpCSSTaskManager({ autoInit: false , build: true});
    gulpCSSTaskManager.watchCSS();
}

/** JS Tasks */
exports.compileJS = () => {
    /** Compile with options */
    const gulpJSTaskManager = new GulpJSTaskManager({ autoInit: true });
    return gulpJSTaskManager.compileJsSync();
}

/** JS Watch */
exports.watchJS = () => { 
    const gulpJSTaskManager = new GulpJSTaskManager({ autoInit: false , watch: true});
    return gulpJSTaskManager.watchJsSync();
}

/** JS Build Task */
exports.buildJS = () => {
    const gulpJSTaskManager = new GulpJSTaskManager({ autoInit: false , 
            build: true, key: 'js'});
    return gulpJSTaskManager.compileJsSync();
}

/** Build HTML */
exports.buildHTML = (cb) => {

    const gulpHtmlTasks = new GulpHTMLTasks({ watch: false});
    gulpHtmlTasks.compileHtmlSync();    
    cb();
}

/** Watch HTML */
exports.watchHTML = () => {
    const gulpHtmlTasks = new GulpHTMLTasks({ watch: true});
    gulpHtmlTasks.watchHtmlSync();
}

/** Build Images */
exports.buildImages = (cb) => {
    const gulpImageTasks = new GulpImageTasks({ watch: false});
    gulpImageTasks.compileImagesSync();
    cb();
}
/** Watch Image */
exports.watchImage = (cb) => {
    const gulpImageTasks = new GulpImageTasks({ watch: true});
    gulpImageTasks.watchImagesSync();
    cb();
}

/** Init function */
exports.buildInit = series(this.buildHTML, 
    this.buildSCSS, this.buildCSS, 
    this.buildJS, this.buildImages);

/** Watch */
exports.watch = parallel(this.watchHTML, this.watchImage,
    this.watchCSS, this.watchJS);

/** Icons */

exports.compileIcons = (cb) => {
   const gulpIconTasks = new GulpIconTasks({ autoInit: true , build : false});
    gulpIconTasks.compileMultiDest();
    cb();
}

/**
 * fontawesome icon builder.
 * @param {*} cb 
 */
exports.buildAllFa = (cb) => {

    const gulpCSSTaskManager = new GulpCSSTaskManager({ 
        autoInit: false, build: true, key: 'fontawesome' });

    const gulpIconTasks = new GulpIconTasks({ autoInit: false, watch: false,
        build: true, key: 'fontawesome'});

    const gulpJSTaskManager = new GulpJSTaskManager({ autoInit: false , 
        watch: false, build: true, key: 'fontawesome'});

    
    gulpCSSTaskManager.compileCssSync(); 
    gulpIconTasks.compileIconSets();
    gulpJSTaskManager.compileJsSync();

    cb();
    
}

/**
 * bootstrap icon builder
 * @param {*} cb 
 */
exports.buildAllBi = (cb) => {

    const gulpCSSTaskManager = new GulpCSSTaskManager({ 
        autoInit: false, build: true, key: 'bootstrapIcon'  });

    const gulpIconTasks = new GulpIconTasks({ autoInit: false, watch: false,
        build: true, key: 'bootstrap'});
    
    /*
    const gulpJSTaskManager = new GulpJSTaskManager({ autoInit: false , 
        watch: false, build: true, key: ['bootstrap' , 'popper']}); */

    
    gulpCSSTaskManager.compileCssSync(); 
    gulpIconTasks.compileIconSets();
    //gulpJSTaskManager.compileJsSync();

    cb();

}

exports.move = (cb) => {

    const gulpResourceHandler = new GulpResourceHandler();
    
    cb();
}