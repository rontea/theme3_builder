'use strict';
const urlPathMaker = require('../../func/utils/utils');
const SymLink = require('../../func/scripts/SymLink');



const createGulpSymlink = () => {

    let src = urlPathMaker.twhUrlPathMaker();
    let dest = urlPathMaker.twhUrlPathMaker({ topFolder: "../theme_3", folder: "test"});
    
    const symlink = new SymLink({ src : src , dest: dest});
    symlink.displayInfo();
    symlink.createSymLinkSync();

};

const unlinkGulpSymlink = () => {
    let src = urlPathMaker.twhUrlPathMaker();
    let dest = urlPathMaker.twhUrlPathMaker({ topFolder: "../theme_3", folder: "test"});

    const symlink = new SymLink({ src : src , dest: dest });
    symlink.displayInfo();
    symlink.removeSymLinkSync();
};

module.exports = { createGulpSymlink , unlinkGulpSymlink };