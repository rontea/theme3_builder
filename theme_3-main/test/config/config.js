/** 
    Configuration files
*/

'use strict';


const env = process.env.NODE_ENV || 'development';

const config = {
   
        development : {

            settings: {
                mainfolder: "node_modules",
                projectfolder: "theme_3",
            } ,

            mainbuild : "build", 
            
            csspaths : {

                maincss: "src/css/",
                mainscss: "src/scss/",
                maindest: "build/css/",
                paths: [
                    { key : 'css' , path: 'src/css/**/*.css' },
                    { key : 'scss' , path: 'src/scss/**/*.scss' },
                    { key : 'bootstrap' , path: 'node_modules/bootstrap/scss/bootstrap.scss' },
                    { key : 'bootstrapIcon' , path: 'node_modules/bootstrap-icons/font/bootstrap-icons.scss' },
                    { key : 'fontawesome' , path: 'node_modules/@fortawesome/fontawesome-free/scss/fontawesome.scss' },
                    { key : 'bulma' , path: 'node_modules/bulma/bulma.scss' },
                    { key : 'prism' , path: 'node_modules/prismjs/themes/prism.min.css' },
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
                    { key: 'js' , path: 'src/js/**/*.js'  },
                    { key: 'jquery' , path: 'node_modules/jquery/dist/jquery.min.js' },
                    { key: 'popper' , path: 'node_modules/@popperjs/core/dist/umd/popper.min.js'},
                    { key: 'tether' , path: 'node_modules/tether/dist/js/tether.min.js'},
                    { key: 'bootstrap', path: 'node_modules/bootstrap/dist/js/bootstrap.min.js'},
                    { key: 'fontawesome', path: 'node_modules/@fortawesome/fontawesome-free/js/all.min.js' }
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
                    { key: 'fontawesome' , path: "node_modules/@fortawesome/fontawesome-free/webfonts/**/*" },
                    { key: 'bootstrap' , path: "node_modules/bootstrap-icons/font/fonts/**/*" },
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