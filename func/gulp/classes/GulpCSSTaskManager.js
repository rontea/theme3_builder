"use strict";

const config = require("../../config/configLoader.js");
const { src, dest, watch } = require("gulp");
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

            /** List */
            this.#src = options.src || [];
            this.#autoInit = options.autoInit || false;
            this.#baseDest = config.csspaths.maindest;

            this.#pathHandler = new PathHandler(argv.dest,this.#baseDest);

            this.#dest = this.#pathHandler.getDestPath();
            this.#options = options;
            
            this.#options.getHelp = false || options.getHelp;
            this.#options.watch = options.watch || false;
            this.#options.autoprefixer = options.autoprefixer || false;
            this.#numVersion = argv.autoprefixer || options.numVersion || 0;

            let commands = ['dest', 'compress' , 'autoprefixer'];
            const keysReference = config.csspaths.paths;

            if(this.#options.getHelp,commands) {
                commands.push('list');
                const lang = "CSS";
                const command = options.command || "command";
                this.#help(keysReference,lang,command,commands);  
            }

            
            this.#invalidArgsHandler = new 
                InvalidArgsHandler(argv,keysReference,commands);
            
            this.#invalidArgsHandler.on('invalidArgs' , (invalidKeys,validKeys) => {
                console.error(`Invalid options provided: ${invalidKeys.join(', ')}`);
                console.error(`Please check the available options: ${validKeys.join(', ')}`);
                process.exit(1);
            });

            if(this.#numVersion === true){
                this.#numVersion = 2;
            }

            if (this.#autoInit !== false && 
                    this.#invalidArgsHandler.checkInvalidArgs()) {
                 this.#checkFlags();
            }

        }catch(err) {
            logErr.writeLog(err , {customKey: 'GulpCSSTaskManager construct failed'});
        }
        

    }
    /**
     * List the available keys with descriptions
     * @param {string} lang 
     * @param {string} command 
     * @param {Array} commands 
     */
    async #help(keysReference,lang,command,commands) {
        try{    
            if(argv.list){
                const descriptions = {
                    dest: "Alter Destination",
                    compress: "Compress CSS",
                    autoprefixer: "Add autoprefixer value (1-5)",
                    list : "List available keys"
                }

                commands = gulpKeyCheck.mapDescription(commands, descriptions)
                gulpKeyCheck.checkAll(keysReference,lang,command,commands);
                process.exit();
            }

        }catch(err){
            logErr.writeLog(err , {customKey: 'Help error'});
        }
    }

    /**
    * This will return all options
    * @returns array 
    */

    getOptions() {
        try{
            return this.#options;
        }catch(err) {
            logErr.writeLog(err , {customKey: 'Return options error'});
        }
        
    }

    /**
     *   Accept argument on CLI , check config.js csspaths for keys
     *   gultTasks task --option --option
    */

    #checkFlags() {

        try {
            config.csspaths.paths.forEach( (item) => {
                if (argv[item.key]) {
                    this.#src.push(item.path);
                }
            });
          
            if (this.#src.length === 0 && !this.#options.getHelp) {
            console.log("Option not available");
            }

        }catch(err){
            logErr.writeLog(err , {customKey: 'CSS Key checking error'});
        }

    }

    /**
     * This will set the source for the build request
     * @param {Array || string } typeBuild 
    */

    #buildSet(typeBuild) {

        try{

            let checkAvailable = false;

            if(Array.isArray(typeBuild)) {

                typeBuild.forEach(key => {
                    config.csspaths.paths.forEach((item) => {
                
                        if (item.key === key) {
                        this.#src.push(item.path);
                        checkAvailable = true;
                        console.log("Type Build " , key);
                        }
                    });
                });


            }else {
                config.csspaths.paths.forEach((item) => {
                
                    if (item.key === typeBuild) {
                    this.#src.push(item.path);
                    checkAvailable = true;
                    console.log("Type Build " , typeBuild);
                    }
                });
            }

            if (checkAvailable === false) {
                console.log(
                typeBuild,
                "Not available please check config for available keys ..."
                );
            }

        }catch(err){
            logErr.writeLog(err , {customKey: 'Type build checking error'});
        }

        
    }

    /**
     * This will build the CSS to the destination
     * @returns gulp task
    */

    async compileCssSync() {

        try{

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
                this.#invalidArgsHandler.checkInvalidArgs() === false) 
            {
                
                console.log("No valid option provided ending process ...");
                return;
            }

            let stream = src(this.#src , {allowEmpty : true});

            stream = stream.pipe(sass()
                .on('error' , sass.logError , () => {
                    logErr.writeLog(sass.logError , {customKey: 'Sass Error'});
                })
                .on('end' , () => {
                    console.log("... SASS compile completed.");
                }));

            if(argv.compress || this.#options.compress) {
                
                stream = stream.pipe(sass({outputStyle : 'compressed'})
                    .on('error' , sass.logError, () => {
                        logErr.writeLog(sass.logError , {customKey: 'Sass Error'});
                    })
                    .on('end' , () => {
                        console.log("... Compress completed.");
                    }));
            }

            if(argv.autoprefixer || this.#options.autoprefixer){

                console.log("Autoprefixer value: " , this.#numVersion);
                let numVersion = 0;
                numVersion = this.#numVersion;
            
                console.log("Starting Autoprefixer with last version request of " , this.#numVersion);
                
                numVersion = await this.#isValidValue(numVersion);

                stream =  stream.pipe(postcss([autoprefixer({ overrideBrowserslist: [`last ${numVersion} versions`]  })])) 
                .on('error' , err => {
                    logErr.writeLog(err , {customKey: 'Error on CSS/SASS move'});
                })
                .on('end', () => {
                    console.log("... Autoprefixer completed last: " , numVersion);
                });
            }

            stream = stream.pipe(dest(this.#dest));

            /** Check fo watch option */
            if(this.#options.watch === true) {
                stream = stream.pipe(browserSync.stream());
            }

            return stream.on("end", () => {
                console.log("... CSS build completed.");
            }).on('error', () => {
                console.log("found it");
            });

        }catch(err){
            logErr.writeLog(err , {customKey: 'Compile CSS/SCSS error'});
        }
    }

    async #isValidValue(numVersion) {

        try{

            if(numVersion > 0 && numVersion <= 5) {
                console.log("Setting Value of :" , numVersion);
                numVersion = numVersion;
            }else {
                
                numVersion = config.csspaths.settings.autoprefixer;
                console.log(`Only accepts 1-${config.csspaths.settings.limit} > Invalid last version request of ` , this.#numVersion);
                console.log("Setting default on config.js ", numVersion )
            }
    
            return numVersion;

        }catch(err){
            logErr.writeLog(err , {customKey: 'isValid Value check error'});
        }
    }

    /**
     * This will watch the change on css and scss folders
     * @returns watch
    */

    async watchCSS() {

        try{

        let cssPath = config.csspaths.watch.css;
        let sassPath = config.csspaths.watch.scss;

        this.#dest = config.csspaths.maindest;

        console.log("Start CSS watching ... ");

        return watch([cssPath,sassPath], { ignoreInitial: false})
            
            .on('change', (file) => {
                
                if(file.endsWith('.css')) {
                    console.log("... Build run CSS");
                    this.#src = cssPath;
                    this.compileCssSync();
                }else if(file.endsWith('.scss')){
                    console.log("... Build run SASS");
                    this.#src = sassPath;
                    this.compileCssSync();
                }
                
                
            }).on('add' , (file) => {

                if(file.endsWith('.css')) {
                    console.log("... Build run CSS");
                    this.#src = cssPath;
                    this.compileCssSync();
                }else if(file.endsWith('.scss')){
                    console.log("... Build run SASS");
                    this.#src = sassPath;
                    this.compileCssSync();
                }

            }).on('unlink' , (file) => {

                let relativePath = "";
                let destFile = "";
                
                if(file.endsWith('.css')){
                    console.log("... On Delete > ", file);
                    relativePath = path.relative(config.csspaths.maincss, file);
                    destFile = path.join(this.#dest, relativePath);
           
                } else if(file.endsWith('.scss')) {

                    console.log("... On Delete > ", file);
                    relativePath = path.relative(config.csspaths.mainscss, file);
                    destFile = path.join(this.#dest, relativePath);
                    destFile = destFile.replace(/\.scss$/, '.css');
          
                }
                handler.handlerSetOnDeleteFile(destFile);
            })
            .on('error' , (error) => {
                handler.handlerError(error);
            });

        }catch(err){
            logErr.writeLog(err , {customKey: 'CSS/SASS watch error'});
        }
        
    }

}

module.exports = GulpCSSTaskManager;