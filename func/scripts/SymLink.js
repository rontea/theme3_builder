'use strict';


const path = require('path');
const fs = require('fs');
const urlPathMaker = require('../utils/utils');

class SymLink {


    #src;

    #dest;

    #gulpFile;
    

    /**
     * This will create symbolic link for gulp.
     * @param {src: string , dest : string, gulpFile: string } options 
    */

   
    constructor(options = {}) {

        const makeSrc = urlPathMaker.twhUrlPathMaker({topFolder: 'node_modules' 
            , folder : 'theme_3_v1' });

        const makeDest = urlPathMaker.twhUrlPathMaker();

        this.#src = options.src || makeSrc; 
        this.#dest = options.dest || makeDest;
        this.#gulpFile = options.gulpFile || "gulpfile.js";
    
    }

    /**
     * This will display URL of links for debugging.
     * @param {string} info 
    */

    displayInfo(info = "Creating gulp symlink.") {

        console.log(info)
        console.log("Source : ", this.#src);
        console.log("Destination :" , this.#dest);
        console.log("Path creation");

        let srcPath = path.join(this.#src , this.#gulpFile);        
        let destPath = path.join(this.#dest, this.#gulpFile);

        console.log("Gulp link src " , srcPath);
        console.log("Gulp link dest " , destPath);
    }

    /**
     * This will create symbolic link of gulp.
     * @param {string} gulpFile 
     */

    async createSymLinkSync(gulpFile = this.#gulpFile) {

        this.#gulpFile = gulpFile;

        const srcPath = path.join(this.#src , this.#gulpFile);        
        const destPath = path.join(this.#dest, this.#gulpFile);

        try {
            if(!fs.existsSync(destPath)){
                

                const confirm = await urlPathMaker.readLineYesNoSync();
                
                if(!confirm) {
                    console.log("Abort Operation");
                    return;
                }

                fs.symlink(srcPath, destPath, 'file', (err) => {
                    
                    if(err) {
                        console.log(`Error return shortcut already exist.`);
                        console.log(`Error creating symlink to gulp:, ${err}`);
                    }else {
                        console.log(`Symlink created successfully.`);
                    }
                    
                });

                
            }else{
                console.log(`Gulp link already exists.`);
                console.log(`Rerun and unlink gulp then run the creation again.`);
            }

        }catch(err) {
            console.log("Error on creating symlink ", err);
        }


    }

    /**
     * This will remove the symbolic link of gulp. 
    */

    async removeSymLinkSync() {

        const destPath = path.join(this.#dest , this.#gulpFile);

        try {

            if (fs.existsSync(destPath)) {

                const confirm = await urlPathMaker.readLineYesNoSync();
                
                if(!confirm) {
                    console.log("Abort Operation");
                    return;
                }
       
                fs.unlink(destPath, (err) => {
                    if (err) {
                      console.error(`Gulp link is not yet created: ${err}`);
                     
                    } else {
                      console.log(`Symlink removed successfully.`);
                    }
                });
                  
            }else {
                console.log(`Gulp link not available.`);
                console.log(`Create gulp link first to remove.`);
            }
             
        }catch(err) {
            console.log("Error on remove symlink" , err);
        }
    
    }

}

module.exports = SymLink;