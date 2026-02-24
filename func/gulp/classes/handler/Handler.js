'use strict';
const path = require("path");
const fs = require("fs-extra");
const logErr = require('../../../utils/TimeLogger');
const config = require('../../../config/configLoader');


/**
 * Event Handler
 */

class Handler {

    /**
     * Handle the file delete
     * @param {string} file 
     * @param {string} src 
     * @param {string} dest 
    */

    handlerOnDeleteFile(file,src,dest) {

        try{
            console.log("... On Delete > ", file);
            const relativePath = path.relative(src, file);
            const destFile = path.join(dest, relativePath);

            fs.remove(destFile)
            .then( () => {
                console.log("Removed File Success , Path", destFile);
            }).catch(err => {
                console.error(err);
            });
        }catch(err){
            logErr.writeLog(err , {customKey: 'Handler delete file failed'});
        }

    }

    /**
     * Handle the file delete
     * @param {string} destFile 
     */

    handlerSetOnDeleteFile(destFile){

        try{

            fs.remove(destFile)
            .then( () => {
                console.log("Removed File Success , Path", destFile);
            }).catch(err => {
                console.error(err);
                logErr.writeLog(err , {customKey: 'fse remove error'});
            });

        }catch(err){
            logErr.writeLog(err , {customKey: 'Handler set on delete file failed'});
        }

    }

    /**
     * Handle the Directory Add
     * @param {string} dir 
     * @param {string} src 
     * @param {string} dest 
     */

    handlerOnDirAdd(dir,src,dest) {
        
        try {
            console.log("... On Dir Created > ", dir);
            
            const relativePath = path.relative(src, dir);
            const destFile = path.join(dest, relativePath);

            fs.ensureDir(destFile)
            .then( () => {
                console.log(".... Dir Created >" , destFile);
            }).catch(err => {
                console.error(err);
            });
        }catch(err){
            logErr.writeLog(err , {customKey: 'Handler on DIR add error'});
        }
        
        
    }

    /**
     * Handle on DIR delete
     * @param {string} dir 
     * @param {string} src 
     * @param {string} dest 
     */

    handlerOnDirDelete(dir,src,dest) {

    
    }

    /**
     * Handle Error
     * @param {*} error 
     */

    handlerError(err) {

        if (err.code === 'EPERM') {
            
            logErr.writeLog(err , {customKey: 'Permission error'});
        } else {
            
            logErr.writeLog(err , {customKey: 'Error watching files'});
        }

    }

    /**
     * This method checks if a file exists.
     * @param {string} filePath - The path to the file.
     * @returns {boolean}
    */

    async fileExistsSync(filePath) {

        try {

            let isExist = true;

            if(Array.isArray(filePath)){
                filePath.forEach( (file) => {

                    let fileSrc = path.join(config.settings.mainfolder, file);
                    
                    let fileExist = fs.existsSync(fileSrc);
                    
                    if(!fileExist){
                        isExist = false;
                        return isExist;
                    }
                });
            }else {
                let fileExist = fs.existsSync(filePath);
                

                if(!fileExist) {
                    isExist = false;
                }else{
                    isExist = true;
                }

            }  
            
            return isExist;


        }catch (err) {
            logErr.writeLog(err , {customKey: ` File exist checker error `});   
        }
    
    }

    /**
     * This method checks if a directory exists.
     * @param {string} dirPath - The path to the directory.
     * @returns {boolean}
    */

    directoryExists(dirPath) {
        try {
            return fs.existsSync(dirPath) && fs.lstatSync(dirPath).isDirectory();
        } catch (err) {
            console.error("Error checking directory existence:", err);
            return false;
        }
    }
    

}

const handler = new Handler();
Object.freeze(handler);

module.exports = handler;