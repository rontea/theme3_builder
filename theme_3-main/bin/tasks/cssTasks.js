'use strict';

const GulpCSSTaskManager = require('../../func/gulp/classes/GulpCSSTaskManager');
const logErr = require('../../func/utils/TimeLogger');

const compileCss = () => {

    try {
        const gulpCSSTaskManager = new GulpCSSTaskManager({
            autoInit: true,
            watch: false,
            getHelp: true,
            command: "css-compile"
        });
        gulpCSSTaskManager.compileCssSync();
    } catch (err) {
        logErr.writeLog(err, { customKey: 'CSS_TASK_COMPILE_ERROR', context: 'compileCss' });
    }

};

const buildCss = () => {

    try {
        const gulpCSSTaskManager = new GulpCSSTaskManager({
            autoInit: false,
            build: true,
            key: 'css'
        });
        gulpCSSTaskManager.compileCssSync();
    } catch (err) {
        logErr.writeLog(err, { customKey: 'CSS_TASK_BUILD_ERROR', context: 'buildCss' });
    }

}

const buildScss = () => {

    try {
        const gulpCSSTaskManager = new GulpCSSTaskManager({
            autoInit: false,
            watch: false,
            build: true,
            key: 'scss'
        });
        gulpCSSTaskManager.compileCssSync();
    } catch (err) {
        logErr.writeLog(err, { customKey: 'CSS_TASK_BUILD_SCSS_ERROR', context: 'buildScss' });
    }


}

const buildFontawesomeCss = () => {

    try {
        const gulpCSSTaskManager = new GulpCSSTaskManager({
            autoInit: false,
            build: true,
            key: 'fontawesome'
        });
        gulpCSSTaskManager.compileCssSync();
    } catch (err) {
        logErr.writeLog(err, { customKey: 'CSS_TASK_FONTAWESOME_BUILD_ERROR', context: 'buildFontawesomeCss' });
    }

}

const buildBootstrapIconsCss = () => {

    try {
        const gulpCSSTaskManager = new GulpCSSTaskManager({
            autoInit: false,
            build: true,
            key: 'bootstrapIcon'
        });
        gulpCSSTaskManager.compileCssSync();
    } catch (err) {
        logErr.writeLog(err, { customKey: 'CSS_TASK_BOOTSTRAP_ICONS_BUILD_ERROR', context: 'buildBootstrapIconsCss' });
    }

}

const watchCss = () => {
    try {
        const gulpCSSTaskManager = new GulpCSSTaskManager({
            autoInit: false,
            build: true
        });
        gulpCSSTaskManager.watchCSS();
    } catch (err) {
        logErr.writeLog(err, { customKey: 'CSS_TASK_WATCH_ERROR', context: 'watchCss' });
    }

}

module.exports = {
    compileCss,
    buildCss,
    buildScss,
    buildFontawesomeCss,
    buildBootstrapIconsCss,
    watchCss
};