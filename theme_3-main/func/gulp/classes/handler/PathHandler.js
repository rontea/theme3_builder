'use strict';

const path = require("path");
const logErr = require('../../../utils/TimeLogger.js');

class PathHandler {

    #destArgv;

    #baseDest;

    constructor(destArgv,baseDest) {

      try{

        this.#destArgv = destArgv || '';
        this.#baseDest = baseDest || '';

      }catch(err){
        logErr.writeLog(err , {customKey: 'Path handler error'});
      }

    }

    setDestArgv(destArgv) {
      try{
        this.#destArgv = destArgv;
      }catch(err){
        logErr.writeLog(err , {customKey: 'Set destination error'});
      }
        
    }

    setBaseDest(baseDest){
      try{
        this.#baseDest = baseDest;
      }catch(err){
        logErr.writeLog(err , {customKey: 'Set base destination error'});
      }
        
    }
  
  /**
   * Check path supplied by --dest is not empty and not a number value
   * @param {string} destArgv
   * @returns string
   */

    getDestPath() {

      try{

        if (this.#destArgv === true || this.#destArgv === undefined || typeof this.#destArgv !== 'string') {
         
          if(typeof this.#destArgv !== 'string') {
            console.log("Path not a valid string , default to: ", this.#baseDest);
          }else {
            console.log("Path not provided default to: ", this.#baseDest);
          }
    
          return this.#baseDest;
        
        }
    
        return path.join(this.#baseDest, this.#destArgv);

      }catch(err){
        logErr.writeLog(err , {customKey: 'Get path error'});
      }

    }

}

module.exports = PathHandler;