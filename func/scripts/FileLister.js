"use strict";

const fs = require("fs");
const path = require("path");
const urlPathMaker = require("../utils/utils");
const logErr = require('../utils/TimeLogger');
class FileLister {

  #dirs;
  
  constructor(dirs = {}) {
    this.dirs = [];

    try {
      if (Array.isArray(dirs)) {
        dirs.forEach((dir) => {
          let temp = urlPathMaker.twhUrlPathMaker({ topFolder: dir });
          this.dirs.push(temp);
        });
      } else {
        let temp = urlPathMaker.twhUrlPathMaker({ topFolder: dirs });
        this.dirs.push(temp);
  
      }
    }catch(err) {
      logErr.writeLog(err , {customKey: 'Contructor failed FileLister'});
    }

  }

  getDirs(){
    return this.dirs;
  }

  #getFilesAndDirs(dir) {
    
    try {
      const items = fs.readdirSync(dir);
      const results = {};

      items.forEach((item) => {
        const itemPath = path.join(dir, item);

        const stats = fs.statSync(itemPath);

        if (stats.isDirectory()) {
          results[item] = this.#getFilesAndDirs(itemPath);
        } else {
          results[item] = "file";
        }
      });

      return results;

    } catch (err) {
      
      logErr.writeLog(err , {customKey: '"Get Files and Directory'});
    }

    
  }
  /**
   * 
   * @returns 
  */

  async compareDirsSync() {
    try {
      if (this.dirs.length < 2) {
        console.log("At least two directories are required to compare.");
        return;
      }
      /** Could be better with checker */
      if(!fs.existsSync(this.dirs[0])){
        console.log(`dir not available ${this.dirs[0]}`);
      }else{
        console.log(`dir check available ${this.dirs[0]}`)
      }
      if(!fs.existsSync(this.dirs[1])){
        console.log(`dir not available ${this.dirs[1]}`);
        return;
      }else{
        console.log(`dir check available ${this.dirs[1]}`)
      }
  
      const dirA = this.dirs[0];
      const dirB = this.dirs[1];
  
      console.log(`Comparing directories:\nA: ${dirA}\nB: ${dirB}\n`);
  
      this.#compareDirectories(dirA, dirB);

    }catch(err) {
      logErr.writeLog(err , {customKey: 'CompareDirs issue'});
    }
    
  }

  /**
   * 
   * @param {*} dirA 
   * @param {*} dirB 
   * @param {*} depth 
  */

  #compareDirectories(dirA, dirB, depth = 0) {
    try{
      const prefix = "-".repeat(depth * 2);

      const contentsA = this.#getFilesAndDirs(dirA);
      const contentsB = this.#getFilesAndDirs(dirB);

      const iconTypes = {
        folderA: "❌ (A)",
        folderB: "❌ (B)",
        iconFile: "📄",
        iconfolder: "📁",
        iconX: "❌",
        iconWarn: "⚠️",
      };

      const allKeys = new Set([
        ...Object.keys(contentsA),
        ...Object.keys(contentsB),
      ]);

      let icon = "";

      allKeys.forEach((key) => {
        if (!contentsA[key]) {
          if (typeof contentsB[key] === "object") {
            icon = iconTypes.iconfolder;
          } else {
            icon = iconTypes.iconFile;
          }

          console.log(
            `${prefix} ${iconTypes.iconWarn}  Missing in " ${iconTypes.folderA}: ${icon} ${key}`
          );
        } else if (!contentsB[key]) {
          if (typeof contentsA[key] === "object") {
            icon = iconTypes.iconfolder;
          } else {
            icon = iconTypes.iconFile;
          }

          console.log(
            `${prefix} ${iconTypes.iconWarn}  Missing in "${iconTypes.folderB}": ${icon} ${key} `
          );
        } else if (
          typeof contentsA[key] === "object" &&
          typeof contentsB[key] === "object"
        ) {
          console.log(`${prefix}${iconTypes.iconfolder} ${key}`);

          this.#compareDirectories(
            path.join(dirA, key),
            path.join(dirB, key),
            depth + 1
          );
        } else if (contentsA[key] === "file" && contentsB[key] === "file") {
          console.log(`${prefix}${iconTypes.iconFile}${key}`);
        } else {
          console.log(`${prefix}${iconTypes.iconWarn} Type mismatch:${key}`);
        }
      });
    }catch(err){
      logErr.writeLog(err , {customKey: 'Compare Directories error'});
    }
    

  }

  listFileDirectory() {}

  createListTree(index = 0) {

    try{

      const dir = this.dirs[index] || this.dirs;
   
      if(fs.existsSync(dir)){
          console.log(dir);
          this.#listTreeDirectory(dir);
        
      }else{
        console.log(`dir not available ${dir}` )
      }

    }catch(err){
      logErr.writeLog(err , {customKey: 'Create list tree error'});
    }

  }

  #listTreeDirectory(dir, depth = 0) {

    try{
      
      const prefix = '│   '.repeat(depth);

      const items = fs.readdirSync(dir);

      items.forEach((item, index) => {

          const itemPath = path.join(dir, item);
          const stats = fs.statSync(itemPath);
          const isLast = index === items.length - 1;
          const connector = isLast ? '└── ' : '├── ';
  
          if (stats.isDirectory()) {
              console.log(`${prefix}${connector}${item}/`);
              this.#listTreeDirectory(itemPath, depth + 1);
          } else {
              console.log(`${prefix}${connector}${item}`);
          }
      });

    }catch(err){
      logErr.writeLog(err , {customKey: 'Error in Tree dir creation'});
    }

  }
}

module.exports = FileLister;
