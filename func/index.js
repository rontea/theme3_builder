'use strict';

/**
    Usage:
    const {GulpCSSTaskManager} = require('theme_3');
    const { utils , GulpHTMLTasks } = require('theme_3');
*/

/** Config */
const config = require('./config/config');
const configLoader = require('./config/configLoader');
const GulpCSSTaskManager = require('./gulp/classes/GulpCSSTaskManager');

/** Gulp Classes*/
const GulpCSSTaskManager = require('./gulp/classes/GulpCSSTaskManager');
const GulpHTMLTasks = require('./gulp/classes/GulpHTMLTasks');
const GulpIconTasks = require('./gulp/classes/GulpIconTasks');
const GulpImageTasks = require('./gulp/classes/GulpImageTasks');
const GulpJSTaskManager = require('./gulp/classes/GulpJSTaskManager');
const GulpKeyCheck = require('./gulp/classes/GulpKeyCheck');
const GulpResourceHandler = require('./gulp/classes/GulpResourceHandler');
const gulpUtils = require('./gulp/classes/Utils');

/** Handler */
const changeHandler = require('./gulp/classes/handler/Handler');
const InvalidArgHandler = require('./gulp/classes/handler/InvalidArgsHandler');
const PathHandler = require('./gulp/classes/handler/PathHandler');

/** Scripts */
const FileLister = require('./scripts/FileLister');
const ProjectMaker = require('./scripts/ProjectMaker');

const CreateTime = require('./utils/CreateTime');
const logErr = require('./utils/TimeLogger');
const utils = require('./utils/utils');

/** Config */
exports.config = config;
exports.configLoader = configLoader;

/** Gulp Classes */
exports.GulpCSSTaskManager = GulpCSSTaskManager;
exports.GulpHTMLTasks = GulpHTMLTasks;
exports.GulpIconTasks = GulpIconTasks;
exports.GulpImageTasks = GulpImageTasks;
exports.GulpJSTaskManager = GulpJSTaskManager;
exports.GulpKeyCheck = GulpKeyCheck;
exports.GulpResourceHandler = GulpResourceHandler;
exports.gulpUtils = gulpUtils;

/** Handler */
exports.changeHandler = changeHandler;
exports.InvalidArgHandler = InvalidArgHandler;
exports.PathHandler = PathHandler;

/** Scripts */
exports.FileLister = FileLister;
exports.ProjectMaker = ProjectMaker;

exports.CreateTime = CreateTime;
exports.logErr = logErr;
exports.utils = utils;
