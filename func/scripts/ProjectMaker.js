"use strict";

const path = require("path");
const urlPathMaker  = require("../utils/utils");
const fs = require("fs");
const { src, dest } = require("gulp");
const configLoader = require("../config/configLoader");
const readline = require('readline');
const logErr = require('../utils/TimeLogger');

class ProjectMaker {

  #src;

  #dest;

  #directories;

  #files;

  /**
   *
   * @param {src : string , dest : string , directories : [strings]} options
   */

  constructor(options = {}) {

    try {

      const makeSrc =  path.join(configLoader.settings.mainfolder
        , configLoader.settings.dependency);
  
      const makeDest = configLoader.settings.mainfolder;
  
      this.#src =  options.src ||  makeSrc;
      this.#dest =   options.dest || makeDest;
      this.#files =  options.file ||  "/**/*";
  
      this.#directories = options.dir || [];

    }catch(err) {
      logErr.writeLog(err , {customKey: 'Project builder construct failed'});
    }
    
  }

  /**
   * Display the folder information
   * @param {string} info
   */

  displayInfo(info = "Dir and File Information: ") {
    
    try {

      console.log(info);
      console.log("Source : ", this.#src);
      console.log("Destination :", this.#dest);
      console.log("Folders: ", this.#directories);
      console.log("Files: ", this.#files);

    }catch(err) {
      logErr.writeLog(err , {customKey: 
        'Display information on project create failed'});
    }

  }

  /**
   * Copy the folder of src and html on destination provided that it exist.
   */

  async createNewProjectSync() {
    try {
      fs.readdir(this.#src, async (err, files) => {
        if (err) {
          console.error(`Error reading directory source: ${err}`);
        }
      });
      
      fs.readdir(this.#dest, async (err, files) => {
        if (err) {
          console.error(`Error reading directory ${this.#dest}: ${err}`);
          console.log("Does Not Exist");
          return;
        } else {
          console.log("Folder exist :", this.#dest, files);

          /** Wait for each process */
          for(const directory of this.#directories){
            
            if (files.includes(directory)) {
              console.log("Sub Dir Exist: ", directory);

            } else {
              
              console.log("Sub Dir Non Existing copy DIR : ", directory);
              await this.#copyDirectorySync(directory);
           
            }

          }
          return true;
        }
      });

    } catch (err) {
      logErr.writeLog(err , {customKey: 'Destination check error'});
    }
  }

  /**
   * Copy the directory of the dir defined.
   * @param {string} directory
   */

  async #copyDirectorySync(directory) {
    /** issue of file copy  */
    try {
      
      let pathFilesDest = path.join(this.#dest,directory);
      let pathFilesSrc = path.join(this.#src,directory);
      console.log("Path Destination ", path.join(pathFilesDest,this.#files));
      console.log("Path Source ", path.join(pathFilesSrc,this.#files));

      const userConfirmed = await this.#confirmationCopySync();

      if(userConfirmed) {
        
        const srcPath = path.join(this.#src, directory);
        const destPath = path.join(this.#dest, directory);

        console.log("src ", srcPath);
        console.log("dest ", destPath);

        let source = srcPath + this.#files;
       
        console.log("file ", source);
        

       src(source)
          .pipe(dest(destPath))
          .on('error' , (err) => {
            console.log("Error move on Project maker " , err);
          });
        
        console.log("Copy completed ", directory);

      }else {
        console.log("Operation Cancelled ");
      }
      
    } catch (err) {
      logErr.writeLog(err , {customKey: 'Copy Dir error'});
    }
  }


  async #confirmationCopySync() {
    
    try {
      /** return promise for the await to function */
      return new Promise(resolve => {
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout
        });
  
        rl.question("Are you use you want to continue y/n : " , 
          (answer) => {
            rl.close();
  
            if(answer.toLowerCase() === 'y') {
              
              console.log("User execute operation.");
              resolve(true);

            }else if(answer.toLowerCase() === 'n'){
              
              console.log("User cancelled operation.");
              resolve(false);
  
            }else {
              console.log("User input invalid.")
              resolve(false);
            }
  
        });
      });

    }catch(err) {
      logErr.writeLog(err , {customKey: 'Confirmation error on project maker'});
    }
  }
  
}

module.exports = ProjectMaker;
