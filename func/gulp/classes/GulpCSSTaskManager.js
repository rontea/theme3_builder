"use strict";

const config = require("../../config/configLoader.js");
const { src, dest, watch } = require("gulp");
const browserSync = require("browser-sync").create();
const argv = require("yargs").argv;
const path = require("path");
const sass = require("gulp-sass")(require('sass'));
const autoprefixer = require("autoprefixer");
const handler = require("./handler/Handler.js");
const postcss = require("gulp-postcss");
const PathHandler = require("./handler/PathHandler");
const InvalidArgsHandler = require("./handler/InvalidArgsHandler");
const gulpKeyCheck = require('./GulpKeyCheck.js');
const logErr = require('../../utils/TimeLogger.js');


class GulpCSSTaskManager {

    /**
     * Accepts array of options
     * @param {options.src : string , options.autoInit : boolean , options.watch : boolean,
     *  options.build : boolean , options.key : string || array strings, options.autopefixer: boolean  
     *  options.numVersion : int , options.compress : boolean } options
    */

    #src;

    #autoInit;

    #baseDest;

    #dest;

    #options;

    #numVersion;

    #invalidArgsHandler;

    #pathHandler;


    constructor(options = {}) {

        try {

            // Validate options parameter
            if (options && typeof options !== 'object') {
                throw new Error('Options must be an object');
            }

            /** List */
            this.#src = options.src || [];

            // Validate src is an array if provided
            if (this.#src && !Array.isArray(this.#src)) {
                throw new Error('src must be an array');
            }

            this.#autoInit = options.autoInit || false;
            this.#baseDest = config.csspaths.maindest;

            this.#pathHandler = new PathHandler(argv.dest, this.#baseDest);

            this.#dest = this.#pathHandler.getDestPath();
            this.#options = options;

            this.#options.getHelp = false || options.getHelp;
            this.#options.watch = options.watch || false;
            this.#options.autoprefixer = options.autoprefixer || false;

            // Validate numVersion is a number if provided
            const providedNumVersion = argv.autoprefixer || options.numVersion || 0;
            if (typeof providedNumVersion !== 'number' && typeof providedNumVersion !== 'boolean') {
                console.warn('numVersion should be a number, using default value 0');
                this.#numVersion = 0;
            } else {
                this.#numVersion = providedNumVersion;
            }

            let commands = ['dest', 'compress', 'autoprefixer'];
            const keysReference = config.csspaths.paths;

            if (this.#options.getHelp && commands) {
                commands.push('list');
                const lang = "CSS";
                const command = options.command || "command";
                this.#help(keysReference, lang, command, commands);
            }


            this.#invalidArgsHandler = new
                InvalidArgsHandler(argv, keysReference, commands);

            this.#invalidArgsHandler.on('invalidArgs', (invalidKeys, validKeys) => {
                console.error(`Invalid options provided: ${invalidKeys.join(', ')}`);
                console.error(`Please check the available options: ${validKeys.join(', ')}`);
                process.exit(1);
            });

            if (this.#numVersion === true) {
                this.#numVersion = 2;
            }

            if (this.#autoInit !== false &&
                this.#invalidArgsHandler.checkInvalidArgs()) {
                this.#checkFlags();
            }

        } catch (err) {
            logErr.writeLog(err, {
                customKey: 'GULP_CSS_TASK_MANAGER_CONSTRUCT_ERROR',
                context: { options }
            });
            throw err; // Re-throw to allow caller to handle
        }


    }
    /**
     * List the available keys with descriptions
     * @param {string} lang 
     * @param {string} command 
     * @param {Array} commands 
     */
    async #help(keysReference, lang, command, commands) {
        try {
            if (argv.list) {
                const descriptions = {
                    dest: "Alter Destination",
                    compress: "Compress CSS",
                    autoprefixer: "Add autoprefixer value (1-5)",
                    list: "List available keys"
                }

                commands = gulpKeyCheck.mapDescription(commands, descriptions)
                gulpKeyCheck.checkAll(keysReference, lang, command, commands);
                process.exit();
            }

        } catch (err) {
            logErr.writeLog(err, {
                customKey: 'CSS_HELP_ERROR',
                context: { lang, command }
            });
        }
    }

    /**
    * This will return all options
    * @returns array 
    */

    getOptions() {
        try {
            return this.#options;
        } catch (err) {
            logErr.writeLog(err, {
                customKey: 'CSS_GET_OPTIONS_ERROR',
                context: 'getOptions'
            });
            return null;
        }

    }

    /**
     *   Accept argument on CLI , check config.js csspaths for keys
     *   gultTasks task --option --option
    */

    #checkFlags() {

        try {
            if (!config.csspaths || !Array.isArray(config.csspaths.paths)) {
                console.error('CSS paths configuration is missing or invalid');
                return;
            }

            config.csspaths.paths.forEach((item) => {
                if (argv[item.key]) {
                    this.#src.push(item.path);
                }
            });

            if (this.#src.length === 0 && !this.#options.getHelp) {
                console.log("Option not available");
            }

        } catch (err) {
            logErr.writeLog(err, {
                customKey: 'CSS_CHECK_FLAGS_ERROR',
                context: 'checkFlags'
            });
        }

    }

    /**
     * This will set the source for the build request
     * @param {Array || string } typeBuild 
    */

    #buildSet(typeBuild) {

        try {
            // Validate typeBuild parameter
            if (!typeBuild) {
                console.log("typeBuild parameter is required");
                return;
            }

            let checkAvailable = false;

            if (Array.isArray(typeBuild)) {

                typeBuild.forEach(key => {
                    if (!config.csspaths || !Array.isArray(config.csspaths.paths)) {
                        console.error('CSS paths configuration is missing or invalid');
                        return;
                    }

                    config.csspaths.paths.forEach((item) => {

                        if (item.key === key) {
                            this.#src.push(item.path);
                            checkAvailable = true;
                            console.log("Type Build ", key);
                        }
                    });
                });


            } else {
                if (!config.csspaths || !Array.isArray(config.csspaths.paths)) {
                    console.error('CSS paths configuration is missing or invalid');
                    return;
                }

                config.csspaths.paths.forEach((item) => {

                    if (item.key === typeBuild) {
                        this.#src.push(item.path);
                        checkAvailable = true;
                        console.log("Type Build ", typeBuild);
                    }
                });
            }

            if (checkAvailable === false) {
                console.log(
                    typeBuild,
                    "Not available please check config for available keys ..."
                );
            }

        } catch (err) {
            logErr.writeLog(err, {
                customKey: 'CSS_BUILD_SET_ERROR',
                context: { typeBuild }
            });
        }


    }

    /**
     * This will build the CSS to the destination
     * @returns gulp task
    */

    async compileCssSync() {

        try {

            // Validate required configuration
            if (!config.csspaths) {
                throw new Error('CSS configuration is not loaded');
            }

            /** Build by key */
            if (this.#options.build === true) {
                let typeBuild = this.#options.key;

                console.log("... Building for :", typeBuild);

                this.#buildSet(typeBuild);

            }

            console.log("Source Path :", this.#src);
            console.log("Destination Path :", this.#dest);

            /** Input and Command Checker */
            if (this.#src.length === 0 ||
                this.#invalidArgsHandler.checkInvalidArgs() === false) {

                console.log("No valid option provided ending process ...");
                return;
            }

            let stream = src(this.#src, { allowEmpty: true });

            stream = stream.pipe(sass()
                .on('error', (err) => {
                    logErr.writeLog(err, {
                        customKey: 'SASS_COMPILE_ERROR',
                        context: { src: this.#src }
                    });
                    sass.logError.call(sass, err);
                })
                .on('end', () => {
                    console.log("... SASS compile completed.");
                }));

            if (argv.compress || this.#options.compress) {

                stream = stream.pipe(sass({ outputStyle: 'compressed' })
                    .on('error', (err) => {
                        logErr.writeLog(err, {
                            customKey: 'SASS_COMPRESS_ERROR',
                            context: { src: this.#src }
                        });
                        sass.logError.call(sass, err);
                    })
                    .on('end', () => {
                        console.log("... Compress completed.");
                    }));
            }

            if (argv.autoprefixer || this.#options.autoprefixer) {

                console.log("Autoprefixer value: ", this.#numVersion);
                let numVersion = 0;
                numVersion = this.#numVersion;

                console.log("Starting Autoprefixer with last version request of ", this.#numVersion);

                numVersion = await this.#isValidValue(numVersion);

                stream = stream.pipe(postcss([autoprefixer({ overrideBrowserslist: [`last ${numVersion} versions`] })]))
                    .on('error', err => {
                        logErr.writeLog(err, {
                            customKey: 'AUTOPREFIXER_ERROR',
                            context: { numVersion }
                        });
                    })
                    .on('end', () => {
                        console.log("... Autoprefixer completed last: ", numVersion);
                    });
            }

            stream = stream.pipe(dest(this.#dest));

            /** Check for watch option */
            if (this.#options.watch === true) {
                stream = stream.pipe(browserSync.stream());
            }

            return stream.on("end", () => {
                console.log("... CSS build completed.");
            }).on('error', (err) => {
                logErr.writeLog(err, {
                    customKey: 'CSS_STREAM_ERROR',
                    context: { src: this.#src, dest: this.#dest }
                });
                console.error("CSS build error:", err.message);
            });

        } catch (err) {
            logErr.writeLog(err, {
                customKey: 'CSS_COMPILE_SYNC_ERROR',
                context: { src: this.#src, dest: this.#dest }
            });
            throw err; // Re-throw to allow caller to handle
        }
    }

    async #isValidValue(numVersion) {

        try {
            // Validate numVersion is a number
            if (typeof numVersion !== 'number') {
                console.warn('numVersion should be a number, using default');
                return config.csspaths.settings.autoprefixer;
            }

            if (numVersion > 0 && numVersion <= 5) {
                console.log("Setting Value of :", numVersion);
            } else {

                numVersion = config.csspaths.settings.autoprefixer;
                console.log(`Only accepts 1-${config.csspaths.settings.limit} > Invalid last version request of `, this.#numVersion);
                console.log("Setting default on config.js ", numVersion)
            }

            return numVersion;

        } catch (err) {
            logErr.writeLog(err, {
                customKey: 'CSS_VALID_VALUE_CHECK_ERROR',
                context: { numVersion }
            });
            return config.csspaths.settings.autoprefixer; // Return default on error
        }
    }

    /**
     * This will watch the change on css and scss folders
     * @returns watch
    */

    async watchCSS() {

        try {

            // Validate required configuration
            if (!config.csspaths || !config.csspaths.watch) {
                throw new Error('CSS watch configuration is not loaded');
            }

            let cssPath = config.csspaths.watch.css;
            let sassPath = config.csspaths.watch.scss;

            this.#dest = config.csspaths.maindest;

            console.log("Start CSS watching ... ");

            return watch([cssPath, sassPath], { ignoreInitial: false })

                .on('change', (file) => {

                    if (file.endsWith('.css')) {
                        console.log("... Build run CSS");
                        this.#src = cssPath;
                        this.compileCssSync();
                    } else if (file.endsWith('.scss')) {
                        console.log("... Build run SASS");
                        this.#src = sassPath;
                        this.compileCssSync();
                    }


                }).on('add', (file) => {

                    if (file.endsWith('.css')) {
                        console.log("... Build run CSS");
                        this.#src = cssPath;
                        this.compileCssSync();
                    } else if (file.endsWith('.scss')) {
                        console.log("... Build run SASS");
                        this.#src = sassPath;
                        this.compileCssSync();
                    }

                }).on('unlink', (file) => {

                    let relativePath = "";
                    let destFile = "";

                    if (file.endsWith('.css')) {
                        console.log("... On Delete > ", file);
                        relativePath = path.relative(config.csspaths.maincss, file);
                        destFile = path.join(this.#dest, relativePath);

                    } else if (file.endsWith('.scss')) {

                        console.log("... On Delete > ", file);
                        relativePath = path.relative(config.csspaths.mainscss, file);
                        destFile = path.join(this.#dest, relativePath);
                        destFile = destFile.replace(/\.scss$/, '.css');

                    }
                    handler.handlerSetOnDeleteFile(destFile);
                })
                .on('error', (error) => {
                    handler.handlerError(error);
                });

        } catch (err) {
            logErr.writeLog(err, {
                customKey: 'CSS_WATCH_ERROR',
                context: 'watchCSS'
            });
            throw err; // Re-throw to allow caller to handle
        }

    }

}

module.exports = GulpCSSTaskManager;