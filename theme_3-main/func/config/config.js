/** 
    Configuration files
*/
const path = require('path');

'use strict';

const env = process.env.NODE_ENV || 'development';

const config = {

        development : {
            env: env,
            settings: {
                /** current working directory */
                mainfolder: process.cwd(),
                filelister:  path.resolve( process.cwd() , 'src'),
                dependency: '/node_modules/theme_3',
                projectfolder: [ 'html' , 'src']
            } ,

            mainbuild : "build", 
            
            csspaths : {

                maincss: "src/css/",
                mainscss: "src/scss/",
                maindest: "build/css/",
                paths: [
                    { key : 'css' , path: 'src/css/**/*.css' , descr: "compile CSS on [src/css]"  },
                    { key : 'scss' , path: 'src/scss/**/*.scss', descr: "compile SCSS [src/scss]" },
                    { key : 'bootstrap' , path: 'node_modules/bootstrap/scss/bootstrap.scss' , descr: "compile boostrap to CSS" },
                    { key : 'bootstrapIcon' , path: 'node_modules/bootstrap-icons/font/bootstrap-icons.scss', descr: "compile boostrap icon CSS"  },
                    { key : 'fontawesome' , path: 'node_modules/@fortawesome/fontawesome-free/scss/fontawesome.scss' , descr: "compile fontawesome icon CSS" },
                    { key : 'bulma' , path: 'node_modules/bulma/bulma.scss', descr: "compile bulma to CSS"  },
                    { key : 'prism' , path: 'node_modules/prismjs/themes/prism.min.css' , descr: "compile prism css" },
                ],
                settings: {
                    autoprefixer : 2,
                    limit: 5
                },
                watch: {
                    css: 'src/css/**/*.css',
                    scss: 'src/scss/**/*.scss'
                }
                
                
            },
    
            jspaths : {
                main: "src/js",
                maindest: "build/js",
                paths: [
                    { key: 'js' , path: 'src/js/**/*.js' , descr: "Compile JS on [src/js]"  },
                    { key: 'jquery' , path: 'node_modules/jquery/dist/jquery.min.js' , descr: "Compile Jquery" },
                    { key: 'popper' , path: 'node_modules/@popperjs/core/dist/umd/popper.min.js' , descr: "Compile Popper JS"},
                    { key: 'tether' , path: 'node_modules/tether/dist/js/tether.min.js' , descr: "Compile Tether JS"} ,
                    { key: 'bootstrap', path: 'node_modules/bootstrap/dist/js/bootstrap.min.js' , descr: "Compile Bootstrap JS"},
                    { key: 'fontawesome', path: 'node_modules/@fortawesome/fontawesome-free/js/all.min.js' , descr: "Compile fontawesome icons JS" }
                ],
                
            },
    
            jsinc : "build/js/inc",
    
            builds : {
                paniniBuild : "./build"
            },

            htmlpaths: {

                panini: {
                    src: "./html/",
                    dest: "./build",
                    pages: "pages/**/*.{html,hbs,handlebars}",
                    partials: "partials/",
                    layouts: "layouts/",
                    helpers: "helpers/",
                    data: "data/", 
                }
               
            },

            images: {
                main: "src/images/**/*",
                mainsrc:  "src/images/",
                maindest: "build/img/" 
            },
    
            icons : {
                main : [],
                maindest: "build/css/",
                prefix: "/fonts",
                destprefix: "fonts",
                paths : [
                    { key: 'fontawesome' , path: "node_modules/@fortawesome/fontawesome-free/webfonts/**/*" 
                        , descr: "compile fontawesome icons fonts" },
                    { key: 'bootstrap' , path: "node_modules/bootstrap-icons/font/fonts/**/*" 
                        , descr: "compile bootstrap icons fonts" },
                ] 
            },

            resources : {
                mainsrc: "src/resources/",
                destdef: "build/",
                setlock: true
            },
            
            info : {
                compileJS : "$gulp compileJS --options[] --uglify --dest url",
            } 
        },

        production: {
            env: env,
            settings: {
                /** current working directory */
                mainfolder: process.cwd(),
                filelister:  path.resolve( process.cwd() , 'src'),
                dependency: '/node_modules/theme_3',
                projectfolder: [ 'html' , 'src']
            } ,

            mainbuild : "build", 
            
            csspaths : {

                maincss: "src/css/",
                mainscss: "src/scss/",
                maindest: "build/css/",
                paths: [
                    { key : 'css' , path: 'src/css/**/*.css' , descr: "compile CSS on [src/css]"  },
                    { key : 'scss' , path: 'src/scss/**/*.scss', descr: "compile SCSS [src/scss]" },
                    { key : 'bootstrap' , path: 'node_modules/bootstrap/scss/bootstrap.scss' , descr: "compile boostrap to CSS" },
                    { key : 'bootstrapIcon' , path: 'node_modules/bootstrap-icons/font/bootstrap-icons.scss', descr: "compile boostrap icon CSS"  },
                    { key : 'fontawesome' , path: 'node_modules/@fortawesome/fontawesome-free/scss/fontawesome.scss' , descr: "compile fontawesome icon CSS" },
                    { key : 'bulma' , path: 'node_modules/bulma/bulma.scss', descr: "compile bulma to CSS"  },
                    { key : 'prism' , path: 'node_modules/prismjs/themes/prism.min.css' , descr: "compile prism css" },
                ],
                settings: {
                    autoprefixer : 2,
                    limit: 5
                },
                watch: {
                    css: 'src/css/**/*.css',
                    scss: 'src/scss/**/*.scss'
                }
                
                
            },
    
            jspaths : {
                main: "src/js",
                maindest: "build/js",
                paths: [
                    { key: 'js' , path: 'src/js/**/*.js' , descr: "Compile JS on [src/js]"  },
                    { key: 'jquery' , path: 'node_modules/jquery/dist/jquery.min.js' , descr: "Compile Jquery" },
                    { key: 'popper' , path: 'node_modules/@popperjs/core/dist/umd/popper.min.js' , descr: "Compile Popper JS"},
                    { key: 'tether' , path: 'node_modules/tether/dist/js/tether.min.js' , descr: "Compile Tether JS"} ,
                    { key: 'bootstrap', path: 'node_modules/bootstrap/dist/js/bootstrap.min.js' , descr: "Compile Bootstrap JS"},
                    { key: 'fontawesome', path: 'node_modules/@fortawesome/fontawesome-free/js/all.min.js' , descr: "Compile fontawesome icons JS" }
                ],
                
            },
    
            jsinc : "build/js/inc",
    
            builds : {
                paniniBuild : "./build"
            },

            htmlpaths: {

                panini: {
                    src: "./html/",
                    dest: "./build",
                    pages: "pages/**/*.{html,hbs,handlebars}",
                    partials: "partials/",
                    layouts: "layouts/",
                    helpers: "helpers/",
                    data: "data/", 
                }
               
            },

            images: {
                main: "src/images/**/*",
                mainsrc:  "src/images/",
                maindest: "build/img/" 
            },
    
            icons : {
                main : [],
                maindest: "build/css/",
                prefix: "/fonts",
                destprefix: "fonts",
                paths : [
                    { key: 'fontawesome' , path: "node_modules/@fortawesome/fontawesome-free/webfonts/**/*" 
                        , descr: "compile fontawesome icons fonts" },
                    { key: 'bootstrap' , path: "node_modules/bootstrap-icons/font/fonts/**/*" 
                        , descr: "compile bootstrap icons fonts" },
                ] 
            },

            resources : {
                mainsrc: "src/resources/",
                destdef: "build/",
                setlock: true
            },
            
            info : {
                compileJS : "$gulp compileJS --options[] --uglify --dest url",
            } 
        }
        
};

module.exports = config[env];