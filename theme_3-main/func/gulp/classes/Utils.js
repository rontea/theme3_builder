'use strict';

const { tree } = require('gulp');
const config = require('../../config/configLoader.js');
const fse = require('fs-extra');
const logErr = require('../../utils/TimeLogger');

class Utils {

    async gulpCheckerDefaultSync() {

        try {

            const taskTree = tree({ deep: true });
        
            console.log("List of Tasks :");
        
            taskTree.nodes.forEach(node => {
                console.log(`$gulp ${node.label} `);
            });

        }catch(err) {
            logErr.writeLog(err , {customKey: 'gulpCheckerDefaultSync failed'});
        }
        
    }

    /**
     * This will diplay tasks on gulpfile.js
     * @param {*} cb 
    */

    async defaultSync(cb) {
        
        try {
            const taskTree = tree({ deep: true });
        
            console.log("List of Tasks :");
            
            taskTree.nodes.forEach(node => {
                console.log(`$gulp ${node.label} `);
            });
    
            cb();
        }catch(err) {
            logErr.writeLog(err , {customKey: 'Task gulp tree view failed'});
        }

        
    }

    /**
     * My Project Information
     * @param {*} cb 
     */
   
    async helloSync(cb){

        try{
            console.log('============================');
            console.log('Gulp File RR Version v2.0.0 ');
            console.log('===========================');
            console.log('Command tasks view gulp --tasks');
            console.log('Documentation : ');
            console.log('NPM : https://www.npmjs.com/package/theme_3_v1')
            console.log('Website: https://live-rontea.pantheonsite.io/');
            console.log('Git Repo: https://github.com/rontea/theme_3_V1/tree/1.3.0')
            console.log('@ 2024 May RonTea')
            console.log('');
            cb();
        }catch(err) {
            logErr.writeLog(err , {customKey: 'Hello failed'});
        }
    }

    /**
     * This will delete the build folder.
     * @returns remove folder
     */

    async utilsCleanSync(){
       
        try{
            const buildFolder = config.mainbuild;
            console.log("... Clean folder ", buildFolder);
            return fse.remove(buildFolder);
        }catch(err) {
            logErr.writeLog(err , {customKey: 'Clean failed'});
        }
    }
}

/**
 *  Use without declaration of class
 */
const util = new Utils();

Object.freeze(util);

module.exports = util;