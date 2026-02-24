'use strict';

const gulpKeyCheck = require('../../func/gulp/classes/GulpKeyCheck');

const checkCssKey = () => {
    gulpKeyCheck.checkCSSKeySync();
};

const checkJsKey = () => {
    gulpKeyCheck.checkJSKeySync();
};

const checkIconsKey = () => {
    gulpKeyCheck.checkIconsKeySync();
};

module.exports = { checkCssKey , checkJsKey , checkIconsKey};