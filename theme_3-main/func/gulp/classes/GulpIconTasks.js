"use strict";

const config = require("../../config/configLoader.js");
const { argv } = require("yargs");
const { src, dest } = require("gulp");
const InvalidArgsHandler = require("./handler/InvalidArgsHandler");
const PathHandler = require("./handler/PathHandler");
const gulpKeyCheck = require('./GulpKeyCheck.js');
const logErr = require('../../utils/TimeLogger.js');


class GulpIconTasks {

    /**
     * Accepts array of options
     * @param {options.src : string, options.dest : string, 
     * options.build: boolean , options.key : string} options 
    */

    #src;

    #autoInit;

    #baseDest;

    #dest;

    #options;

    #invalidArgsHandler;

    #defaultDest;

    #pathHandler;

    #prefixDest;

    constructor(options = {}){

        try{

            /** List */
            this.#options = options;

            this.#options.getHelp = false || options.getHelp;
            this.#src = options.src || [];
            this.#autoInit = options.autoInit || false;
            this.#baseDest = Array.isArray(argv.dest) ? argv.dest : [argv.dest];
            this.#dest = [] || options.dest;
            this.#options.build = false || options.build;

            this.#defaultDest = config.icons.maindest;
    
            this.#pathHandler = new PathHandler('',this.#defaultDest);

            let commands = ['dest'];
            const keysReference = config.icons.paths;

            if(this.#options.getHelp,commands) {
                commands.push('list');
                const lang = "Icons";
                const command = options.command || "command";
                this.#help(keysReference,lang,command,commands);
            }

            if(argv.list){
                return;
            }

            this.#invalidArgsHandler = new 
            InvalidArgsHandler(argv, keysReference,
                commands);
            
            this.#invalidArgsHandler.on('invalidArgs' , (invalidKeys,validKeys) => {
                console.error(`Invalid options provided: ${invalidKeys.join(', ')}`);
                console.error(`Please check the available options: ${validKeys.join(', ')}`);
                process.exit(1);
            });

            if (this.#autoInit !== false 
                && this.#invalidArgsHandler.checkInvalidArgs()) {
                    
                this.#prefixDest = config.icons.prefix;
                this.#compileSet();
            }

        }catch(err){
            logErr.writeLog(err , {customKey: 'Gulp Icon construct failed'});
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
        }catch(err){
            logErr.writeLog(err , {customKey: 'Return options error'});
        }
        
    }

    /**
     * This will set the source and destination for the build request.
     * In this code the max source is being check for max destination to be equal.
     * This will accept multiple source --key --key --dest x --dest y
     * @return dummy
    */

 
    /** still working on 1 on 1 mapping */
     #compileSet() {
       
        try{

            config.icons.paths.forEach( (item)=> {
            
                if (argv[item.key]) {
                    /** Get argv index */
                    let argvArray = Object.keys(argv).map(key => ({ key, value: argv[key]}));
                    let index = argvArray.findIndex(argv => argv.key === item.key);
                    this.#src[index] = item.path; 
                }
                  
            });
            /** Clean array empty index */
            this.#src = this.#src.filter(item => !(Array.isArray(item) && item.length === 0));
            console.log("Destination Mapping for each :" , this.#src);

        }catch(err){
            logErr.writeLog(err , {customKey: 'Compile set'});
        }

    
    }

    /**
     * This will set the source for the build request
     * @param {Array || string } 
    */

    #buildSet(srcTypeBuild) {

        try{

            let checkAvailable = false;
            let tempDest = "";
            if(Array.isArray(srcTypeBuild)) {
    
                srcTypeBuild.forEach(key => {
                    config.icons.paths.forEach((item) => {
                
                        if (item.key === key) {
                            this.#src.push(item.path);
                            tempDest = config.icons.maindest + config.icons.prefix;
                            this.#dest.push(tempDest);
                            checkAvailable = true;
                            console.log("Type Build " , key);
                        }
                    });
                });
    
                
            }else {
                config.icons.paths.forEach((item) => {
                
                    if (item.key === srcTypeBuild) {
                        this.#src.push(item.path);
                        tempDest = config.icons.maindest + config.icons.prefix;
                        this.#dest.push(tempDest);
                        checkAvailable = true;
                        console.log("Type Build " , srcTypeBuild);
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
     * This will compile the key on each source as the gulp dest do not handle arrays
     * Only the src on gulp handles array but not dest
     * @returns dummy
     */

    compileMultiDest() {

        try{

            if(argv.list){
                return;
            }
    
            if (this.#src.length === 0 ||  this.#invalidArgsHandler.checkInvalidArgs() === false) {
                console.log("No valid option provided ending process ...");
                return "error";
            }
    
            let tempDest = "";
    
            if(Array.isArray(this.#dest)){
    
                this.#src.forEach((item , index)=> {
                    
                    
                    this.#pathHandler.setDestArgv(this.#baseDest[index]);
                    tempDest = this.#pathHandler.getDestPath() +  this.#prefixDest;
                   
                    console.log("Source Path :", item);
                    console.log("Destination Path :", tempDest);
                        
                    src(item, {encoding:false}).pipe(dest(tempDest))
                    .on('end' , () => {
                        console.log("... Icons build completed." , index);
                    }).on('error' , (err) => {
                        console.log("Error on Icon move " , err);
                    });
                       
                });
    
            }

        }catch(err){
            logErr.writeLog(err , {customKey: 'Compile multiple destination error'});
        }
        
    }

    /**
     * This will build the Icon files to the destination
     * @returns gulp task
    */


    compileIconSets() {

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
            if (this.#src.length === 0 || this.checkInvalidArgs === false) {
                console.log("No valid option provided ending process ...");
                return;
            }
        
    
            let stream = src(this.#src, {encoding:false , allowEmpty : true});
    
            stream = stream.pipe(dest(this.#dest));
    
            return stream.on('end' , () => {
                console.log("... Icons build completed.");
            }).on('error', (err) => {
                console.log(err);
            });

        }catch(err){
            logErr.writeLog(err , {customKey: 'Compile icon sets error'});
        }
        
        
    }
}

module.exports = GulpIconTasks;