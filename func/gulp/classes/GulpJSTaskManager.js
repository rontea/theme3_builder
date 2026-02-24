"use strict";

const config = require("../../config/configLoader");
const { src, dest, watch } = require("gulp");
const uglify = require("gulp-uglify");
const argv = require("yargs").argv;
const browserSync = require('browser-sync').create();
const path = require("path");
const handler = require("./handler/Handler");
const PathHandler = require("./handler/PathHandler");
const InvalidArgsHandler = require("./handler/InvalidArgsHandler");
const gulpKeyCheck = require('./GulpKeyCheck.js');
const logErr = require('../../utils/TimeLogger.js');

class GulpJSTaskManager {
  
  /**
   * Accepts array of options
   * @param {options.src : string , options.autoInit : boolean, 
   *  options.watch : boolean , options.build : boolean , 
   *  options.key : string || array strings , options.uglify } options
   * { autoInit : bool, build : bool, key : string }
  */

  #src;

  #autoInit;

  #baseDest;

  #dest;

  #options;

  #invalidArgsHandler;

  constructor(options = {}) {

    try{

      /** List */
      this.#src = options.src || [];
      this.#autoInit = options.autoInit || false;
      this.#baseDest = config.jspaths.maindest;
      //this.#dest = argv.dest ? `${this.baseDest}/${argv.dest}` : this.#baseDest;
      
      const pathHandler = new PathHandler(argv.dest,this.#baseDest);
      
      this.#dest = pathHandler.getDestPath();
      this.#options = options;

      this.#options.getHelp = false || options.getHelp;
      this.#options.watch = options.watch || false;
      
      let commands = ['dest', 'uglify'];
      const keysReference = config.jspaths.paths;

      if(this.#options.getHelp,commands) {
        commands.push('list');
        const lang = "JS";
        const command = options.command || "command";
        this.#help(keysReference,lang,command,commands);  
      }
      
      this.#invalidArgsHandler = new 
        InvalidArgsHandler(argv,keysReference
          ,commands);
      
        this.#invalidArgsHandler.on('invalidArgs' , (invalidKeys,validKeys) => {
          console.error(`Invalid options provided: ${invalidKeys.join(', ')}`);
          console.error(`Please check the available options: ${validKeys.join(', ')}`);
          process.exit(1);
        });

      if (this.#autoInit !== false && 
          this.#invalidArgsHandler.checkInvalidArgs()) {
        this.#checkFlags();
      }

    }catch(err){
      logErr.writeLog(err , {customKey: 'GulpJSTaskManager construct failed'});
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
                    uglify: "Uglify JS",
                    list : "List available keys"
                }

                commands = gulpKeyCheck.mapDescription(commands, descriptions)
                gulpKeyCheck.checkAll(keysReference,lang,command,commands);
                process.exit();
            }

        }catch(err){
           logErr.writeLog(err , {customKey: 'Help Error'});
        }
    }
  
  /**
   * This will return all options
   * @returns array 
  */

  getOptions() {
    try{
      return this.#options;
    }catch(err){
      logErr.writeLog(err , {customKey: 'Getting options error'});
    }
    
  }

  /**
   *  Accept argument on CLI , check config.js jspaths for keys
   *  gultTasks task --option --option
   *
  */

  #checkFlags() {

    try{

      config.jspaths.paths.forEach((item) => {
        if (argv[item.key]) {
          this.#src.push(item.path);
        }
      });
  
      if (this.#src.length === 0 && !this.#options.getHelp) {
        console.log("Option not available");
      }

    }catch(err){
      logErr.writeLog(err , {customKey: 'Check flags error'});
    }

  }
  
    /**
     * This will set the source for the build request
     * @param {Array || string } 
    */

  #buildSet(typeBuild) {

    try{

      let checkAvailable = false;

      if(Array.isArray(typeBuild)) {

          typeBuild.forEach(key => {
              config.jspaths.paths.forEach((item) => {
          
                  if (item.key === key) {
                    this.#src.push(item.path);
                    checkAvailable = true;
                    console.log("Type Build " , key);
                  }
              });
          });

      }else {
          config.jspaths.paths.forEach((item) => {
          
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
      logErr.writeLog(err , {customKey: 'Build set error'});
    }

  }

  /**
   * This will build the JS to the destination
   * @returns gulp task
   */

  async compileJsSync() {

    try{

      if(argv.list){
        return;
      }
      
      if (this.#options.build === true) {
        let typeBuild = this.#options.key;
        console.log("Building invoke for...", typeBuild);
  
        this.#buildSet(typeBuild);
      }
  
      console.log("Source Path :", this.#src);
      console.log("Destination Path :", this.#dest);
  
      /** Input and Command Checker */
      if (this.#src.length === 0 || this.#invalidArgsHandler.checkInvalidArgs() === false) {
        console.log("No valid option provided ending process ...");
        return;
      }
  
      let stream = src(this.#src , {allowEmpty : true});
  
      if (argv.uglify || this.#options.uglify) {
       
        stream = stream.pipe(uglify()
          .on('error', (err) => {
            console.error("Uglify error :", err.toString());
          })
          .on('end' , () => { 
            console.log("... Uglify completed.");
          }));
      }
  
      stream = stream.pipe(dest(this.#dest));
  
      if(this.#options.watch === true) {
        stream = stream.pipe(browserSync.stream());
      }
  
      return stream.on("end", () => {
        console.log("... JS build completed.");
      }).on('error' , (err) => {
        console.log("Error on JS move " , err);
      });

    }catch(err){
      logErr.writeLog(err , {customKey: 'Compile JS error'});
    }

  }

  /**
   * This will watch file changes
   * Plan to add ENV for developement and production
   * @returns gulp watch
   */

  watchJsSync() {

    try{

      this.#src = config.jspaths.main + "/**/*.js";
      this.#dest = config.jspaths.maindest;
      console.log("Start JS watching ... ");
  
      /** Development ENV where file can be deleted on changes */
  
      /**  new file created will overwrite the old one */
      return watch(this.#src, { ignoreInitial: false })
        .on("change", this.compileJsSync.bind(this))
        .on("add", this.compileJsSync.bind(this))
        .on("unlink", (file) => {
         
          handler.handlerOnDeleteFile(file,config.jspaths.main,this.#dest);
  
        }).on('error' , (error) => {
          
          handler.handlerError(error);
  
        });

    }catch(err){
      logErr.writeLog(err , {customKey: 'Watch JS error'});
    }
  }
}

module.exports = GulpJSTaskManager;
