'use strict'

const config = require("../../config/configLoader.js");
const { src, dest, watch } = require("gulp");
const browserSync = require('browser-sync').create();
const handler = require("./handler/Handler.js");
const logErr = require('../../utils/TimeLogger.js');

class GulpImageTasks {
    /**
     * Accepts array of options
     * @param { options.src: string , options.dest : string , options.watch : boolean} options 
    */

    #src;

    #dest;

    #options;

    constructor(options = {}){

        try{

            /** List */
            this.#src = options.src || config.images.main;
            this.#dest = options.dest || config.images.maindest;

            this.#options = options;
            this.#options.watch =  false || options.watch;

        }catch(err){
            logErr.writeLog(err , {customKey: 'Gulp Image tasks construct failed'});
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
     * This will build the Images to the destination
     * @returns gulp task
    */

    async compileImagesSync() {

        try{

            console.log("Source Path :", this.#src);
            console.log("Destination Path :", this.#dest);
            /** Encoding : false fixed corrupt images */        
            let stream = src(this.#src , {encoding:false});
    
            stream = stream.pipe(dest(this.#dest));
    
            if(this.#options.watch) {
                stream = stream.pipe(browserSync.stream());
            }
    
            return stream.on("end", () => {
                console.log("... Image build completed.");
            }).on('error' , (err) => {
                console.log("Error on Image move " , err);
            });

        }catch(err){
            logErr.writeLog(err , {customKey: 'Compile Image error'});
        }
    }

    /**
     * This will watch file changes
     * @returns watch
    */

    async watchImagesSync() {

        try{

            console.log("Start Images watching ... ");

            return watch(this.#src , { ignoreInitial: false})
            .on('change' , this.compileImagesSync.bind(this))
            .on('add' , this.compileImagesSync.bind(this))
            .on('addDir' , (dir) => {
               handler.handlerOnDirAdd(dir,config.images.mainsrc,this.#dest);
            })
            .on('unlink' , (file) => {
                handler.handlerOnDeleteFile(file,config.images.mainsrc,this.#dest);
            })
            .on('unlinkDir' , (dir) => {
                console.log("... On Dir Delete > ", dir);
           
            })
            .on('error' , (error) => {
               handler.handlerError(error);
            });

        }catch(err){
            logErr.writeLog(err , {customKey: 'Watch Image error'});
        }

    }

}

module.exports = GulpImageTasks;