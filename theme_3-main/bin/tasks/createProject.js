'use strict';

const ProjectMaker = require('../../func/scripts/ProjectMaker');
const configLoader = require('../../func/config/configLoader');
const path = require('path');
const logErr = require('../../func/utils/TimeLogger');

const projectFolders = () => {

    try{
        const dest =  configLoader.settings.mainfolder;

        const src =  path.join(configLoader.settings.mainfolder
            , configLoader.settings.dependency);

        console.log(src);
        
        const projectMaker = new ProjectMaker({ src: src, dest: dest
            , dir: configLoader.settings.projectfolder});
    
        projectMaker.createNewProjectSync();
        projectMaker.displayInfo();
    }catch(err){
        logErr.writeLog(err , {customKey: 'customValue'});
    }
};

const setConfig = () => {

    try{
        const dest = configLoader.settings.mainfolder;
        const src = path.resolve(__dirname , '..' , '..', 'func');


        const projectMaker = new ProjectMaker({dest: dest, src : src, dir: ['config'], file: '/config.js'});
        
        projectMaker.createNewProjectSync();
        projectMaker.displayInfo();
    }catch(err) {
        logErr.writeLog(err , {customKey: 'customValue'});
    }
};

module.exports = {projectFolders ,  setConfig}