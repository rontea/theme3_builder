'use strict';


const timeLogger = require('../func/utils/TimeLogger');
const MenuBuilder = require('../func/scripts/MenuHandler');
const SymLink = require('../func/scripts/SymLink');
const ProjectMaker = require('../func/scripts/ProjectMaker');
const urlPathMaker = require('../func/utils/utils');

const menuBuilder = new MenuBuilder( 
    {title : "=== Menu ===" , footer: "========"} ,  
        ["New Project", 
        "Create Gulp Link" , 
        "Remove Gulp Link" ,
        "Exit"]
    );


const optionCallbacks = {
    '1': () => {

        let dest = urlPathMaker.twhUrlPathMaker({ topFolder: "../theme_3_v1", folder: "test"});
        let src = urlPathMaker.twhUrlPathMaker();

        const projectMaker = new ProjectMaker({src : src, dest : dest, dir: [ 'html' , 'src']});
        projectMaker.displayInfo();
        projectMaker.createNewProjectSync();
        

    },
    '2': () => {

        let src = urlPathMaker.twhUrlPathMaker();
        let dest = urlPathMaker.twhUrlPathMaker({ topFolder: "../theme_3_v1", folder: "test"});
        
        const symlink = new SymLink({ src : src , dest: dest});
        symlink.displayInfo();
        symlink.createSymLinkSync();
    },
    '3': () => {
        
        let src = urlPathMaker.twhUrlPathMaker();
        let dest = urlPathMaker.twhUrlPathMaker({ topFolder: "../theme_3_v1", folder: "test"});

        const symlink = new SymLink({ src : src , dest: dest });
        symlink.displayInfo();
        symlink.removeSymLinkSync();
    },
    '4': () => {
        console.log("Exit");
    }
        
};

menuBuilder.displayMenu();
menuBuilder.setHandleOptions(optionCallbacks,"Option Not Available.");