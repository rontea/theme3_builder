'use strict';

const readline = require('readline');
const path = require('path');

function twhUrlPathMaker(url = {}){

    try{
        
        url.topFolder = url.topFolder || "";
        url.folder = url.folder || "";

        return path.resolve(__dirname, '..' , '..' , 
          url.topFolder , url.folder); 
    
    } catch(err){
        console.log("Error on URL pathmaker : ", err);
    }
}

function test(){
    console.log("Test");
}

function writeLine(message) {
    console.log(message);
}

/**
 * This will confirm user input
 * @returns Promise
 */

async function readLineYesNoSync(){

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
        console.lof("Confirmation error :" , err);
      }

}

function joinPath(path,file){

  const joinedPath = path.join(path,file);

  return joinedPath;

}

module.exports = {twhUrlPathMaker , test , writeLine, readLineYesNoSync, joinPath};