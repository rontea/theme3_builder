'use strict';

const FileLister = require('../../func/scripts/FileLister');
const configLoader = require('../../func/config/configLoader');
const logErr = require('../../func/utils/TimeLogger');

const fileLister = () => {

    try {
        const fileLister = new FileLister(configLoader.settings.filelister);
        console.log("List file structure on :" , fileLister.getDirs());
        console.log();
        fileLister.createListTree();
        console.log();
    }catch(err){
        logErr.writeLog(err , {customKey: 'Project helper file lister failed'});
    }
   
   
}

const compareDir = () => {

    try{

        const dependency = configLoader.settings.mainfolder + configLoader.settings.dependency + "/src";
        const fileLister = new FileLister( [configLoader.settings.filelister ,   dependency] );
        fileLister.compareDirsSync();
        console.log();

    }catch(err){
        logErr.writeLog(err , {customKey: 'Compare dirs error'});
    }

}

const checkEnv = () => {
    try{
        console.log("Current Enviroment :" , configLoader.env);
    }catch(err) {   
        logErr.writeLog(err , {customKey: 'Check env error'});
    }
    
    
}

const checkConfigSync = async () => {
    try{
        console.log("Config.js File List :");
        console.log(configLoader);
        console.log();
    }catch(err){
        logErr.writeLog(err , {customKey: 'Config loader error'});
    }

}

const checkDirCurrentSync = async () => {
    try {
        console.log(configLoader.settings.mainfolder);
    }catch(err) {
        logErr.writeLog(err , {customKey: 'Check DIR error'});
    }
}

module.exports = {fileLister , checkEnv , checkConfigSync , compareDir , checkDirCurrentSync};