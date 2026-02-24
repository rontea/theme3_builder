'use strict';

const config = require('../../config/configLoader.js');
const { src, dest, watch, series } = require('gulp');
const panini = require('panini');
const browserSync = require('browser-sync').create();
const path = require('path');
const fs = require('fs-extra');
const logErr = require('../../utils/TimeLogger.js');

class GulpHTMLTasks {

    /**
     * Accepts array of options
     * @param {options.src : string, options.dest : string, 
     * options.watch: boolean} options 
    */

    #src;

    #dest;

    #pages;

    #partials;

    #layouts;
    
    #helpers;

    #data;

    #options;

    constructor(options = {}) {

        try{

            /** List */

            this.#src = options.src || config.htmlpaths.panini.src;
            this.#dest = options.dest || config.htmlpaths.panini.dest;
        
            /** paths */
            this.#pages = path.join(this.#src, config.htmlpaths.panini.pages);
            this.#partials = path.join(this.#src, config.htmlpaths.panini.partials);
            this.#layouts = path.join(this.#src, config.htmlpaths.panini.layouts);
            this.#helpers = path.join(this.#src, config.htmlpaths.panini.helpers);
            this.#data = path.join(this.#src, config.htmlpaths.panini.data);
            
            this.#options = options;
            this.#options.watch = options.watch || false;

        }catch(err){
            logErr.writeLog(err , {customKey: 'Gulp HTML Tasks construct failed'});
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
     * This will build the HTML of Panini
     * @returns gulp tasks
    */

    async compileHtmlSync(){

        try{

            console.log('Compiling HTML...');
            console.log(this.#src);
            console.log(this.#dest);

            let stream = src(this.#pages);

            stream = stream.pipe(
                panini({
                root: this.#pages,
                layouts: this.#layouts,
                partials: this.#partials,
                helpers: this.#helpers,
                data: this.#data
            }));

            stream = stream.pipe(dest(this.#dest));
            /** Check fo watch option */
            if(this.#options.watch === true) {
                stream = stream.pipe(browserSync.stream());
            }
        
            return  stream.on('end' , () => {
                console.log("... HTML build completed.");
            }).on('error' , (err) => {
                logErr.writeLog(err , {customKey: 'Error on HTML move'}); 
            });

        }catch(err){
            logErr.writeLog(err , {customKey: 'Compile HTML error'});
        }

    }
    /**
     * This will reset paninin caching
     * @param {*} cb 
    */

    async #resetPaniniSync(cb) {
        try{
            console.log("... Resetting Panini cache.");
            panini.refresh();
            cb();
        }catch(err){
            logErr.writeLog(err , {customKey: 'Reset Panini error'});
        }

    }

    /**
     * This will watch the change on HTML folder for Panini
     * @returns watch
    */

    async watchHtmlSync() {

        try{

            console.log("... Start watching HTML.")

            browserSync.init({
                server: {
                    baseDir: this.#dest
                }
            });
    
            return watch([this.#pages, this.#partials , this.#layouts , this.#helpers, this.#data],  
                    { ignoreInitial: false},
                    series(this.#resetPaniniSync.bind(this) , this.compileHtmlSync.bind(this)))
                    .on('unlink' , (file) => {
                        
                        if(file.startsWith(path.join(this.#src, 'pages'))){
                            console.log("... On Delete: > ", file);
                            /** Make sure it only delete on pages and on join remove text 'pages'*/
                            const relativePath = path.relative(path.join(this.#src, 'pages'), file);
                            const destFile = path.join(this.#dest, relativePath);
                            
                            try {
                                fs.remove(destFile);
                                console.log("Removed File Successfully, Path", destFile);
                            } catch (err) {
                                logErr.writeLog(err , {customKey: 'Error removing file'});
                            }
                        }else {
                            console.log(".... On Delete source only: > ", file);
                        }
    
                    });

        }catch(err){
            logErr.writeLog(err , {customKey: 'Watch error'});
        }

    }

}

module.exports = GulpHTMLTasks;