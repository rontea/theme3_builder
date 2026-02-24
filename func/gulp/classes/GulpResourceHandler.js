'use strict';

const config = require("../../config/configLoader");
const argv = require("yargs").argv;
const readline = require('readline');
const {glob} = require('glob');
const fs = require('fs');
const {dest , src } = require('gulp');
const path = require('path');
const InvalidArgsHandler = require("./handler/InvalidArgsHandler");
const gulpKeyCheck = require('./GulpKeyCheck.js');
const logErr = require('../../utils/TimeLogger.js');

class GulpResourceHandler {

    /**
     * 
     * @param {options.src : string , options.dest: string 
     *  options.setLock : boolean  } options 
    */

    #src;

    #dest;

    #setLock;

    #srcDef;

    #destDef;

    #options;

    #invalidArgsHandler;

    constructor (options = {}) {

        try{

            this.#options = options;
            /** List */
            this.#src = options.src || argv.src;
            this.#dest = options.dest || argv.dest;
            this.#options.getHelp = false || options.getHelp;

            let commands = ['src', 'dest'];
            const keysReference = "";

            if(this.#options.getHelp,commands) {
                commands.push('list');
                const lang = "Move Resources";
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

            this.#setLock = config.resources.setlock || options.setLock;

            this.#srcDef = config.resources.mainsrc;
            this.#destDef = config.resources.destdef;

            this.#options = options;

            /** Lock */
            if(this.#setLock) {
                
                this.#src = this.#srcDef + this.#src;

                if(this.#dest === true){
                    
                    this.#dest = this.#destDef;
                    console.log("Empty denstation default to:" , this.#dest);
                }else {
                    this.#dest = this.#destDef + this.#dest;
                }

                console.log("Note : Option Lock for folder source:" , this.#src);
                console.log("Note : Option Lock for folder destination:" , this.#dest);
            
            /** Move All */    
            }else {
                this.#src = '/' + this.#src;
                this.#dest = "build/" + this.#dest;
                console.log("Note : Option Unlock for folder move item anyware.");
            }

            if(this.#invalidArgsHandler.checkInvalidArgs()) {
                this.#moveFilesSync();
            }

        }catch(err){
            logErr.writeLog(err , {customKey: 'Gulp resource handler error'});
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
                    dest: "Destination of file or folder",
                    src: "Source of file or folder",
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
     * This will check for confirmation from user.
     * @returns boolean
     */
     async #checkMoveSync() {

        return new Promise((resolve,reject) => {

            const rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout
            });
    
            rl.question(`Are you sure to move files it my override existing "${this.#src}" to "${this.#dest}" "y/n"? : `,
                (answer) => {
                    rl.close();
                    if(answer.toLowerCase() === 'y') {
                     
                        resolve(true);
                    }else if(answer.toLowerCase() === 'n') {
                        
                        resolve(false);
                    }else {
                        console.log("No valid option");
                        resolve(false);

                    }
    
                }
            );
        });
    }

    /**
     * This will move the files from source to destination
     * @returns gulp 
     */

    async #moveFilesSync() {

        let filePath = this.#src;

        try {
           
            if(this.#isDirectorySync(filePath)) {
                filePath = path.posix.join(filePath, "/**/*");
            }
            
            console.log("File Path :", filePath);

            const isDir = this.#isDirectorySync(this.#src);

            const files = await glob(filePath);
           
            console.log("List : " , files);
            
            /** Checking Src exist */
            if (!fs.existsSync(this.#src)) {
                console.log('--src doesnt exist try again with correct source path.');
                console.log(`Moving folder from ${this.#src} -> ${this.#dest} FAILED!`);
                return;
            }

            /** Wait first for user confirmation Before Moving */
            const userConfirmed = await this.#checkMoveSync();

            if (!userConfirmed) {
                console.log("... Move Cancelled");
                return;
            }

            console.log("Processing Move ...");
            
            let stream = "";

            if(isDir) {
                stream = src(this.#src + "/**/*");
                
            }else {
                stream = src(this.#src);
            }
            
            stream = stream.pipe(dest(this.#dest));
            
            return stream.on('end', () => {
                console.log("... Move Completed");
            })
            .on('error' , (err) => {
                console.log("Error on resource move " , err);
            });
        
        }catch (err) {
            logErr.writeLog(err , {customKey: 'Move file async error'});
        }

    }
    
    /**
     * This will check if file is a DIR or not.
     * @param {string} filePath 
     * @returns boolean
    */

    #isDirectorySync(filePath) {
        try {
            const stats = fs.statSync(filePath);
            return stats.isDirectory();
        } catch (err) {
            // If an error occurs, log it and return false
           
            if(err.code === "ENOENT") {
                console.log("Error on path , please check the paths.");
            }else {
                console.error('Error checking path:', err);
            }
            return false;
        }
    }
}

module.exports = GulpResourceHandler;