'use strict';

const fs = require('fs-extra');
const path = require('path');
const readline = require('readline');
const log = require('../tvw-log.js');
const getTime = require('../tvw-time.js');
const { time } = require('console');

const source = path.resolve(__dirname, '..', '..', 'node_modules', 'theme_3_v1');
const sourceSymLink = path.resolve(__dirname, '..', '..', 'node_modules', 'theme_3_v1');
const destination = path.resolve(__dirname, '..', '..');



const timelog = getTime();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});


/** Check DIR */

function checkFolderContents(directory) {
  console.log(destination);
  console.log(source);

  const sourceFiles = fs.readdirSync(source);
  const destFiles = fs.readdirSync(destination);

  fs.readdirSync(directory).forEach(file => {

    const filePath = path.join(directory, file);
    console.log(filePath);

  });

  const missingInDestination = sourceFiles.filter(file => !destFiles.includes(file));
  console.log(missingInDestination);

  fs.readdir(directory, (err, files) => {
    if (err) {
      console.error(`Error reading directory ${directory}: ${err}`);
      log(err);
      return;
    }

    // Check if 'html' and 'src' folders exist in the current directory
    if (files.includes('html') && files.includes('src')) {
      console.log(`[${timelog}]Both 'html' and 'src' folders found in: ${directory}`);
      console.log(`[${timelog}]Begin checking on ${directory}`);
       
          // Compare the files in the source and destination folders
          if (missingInDestination.length > 0) {
            console.log(`[${timelog}]Files missing in the destination folder:`);
            missingInDestination.forEach(file => {
              console.log(file);
            });
          } else {
            console.log(`[${timelog}]No missing files found.`);
          }
        

    } else {
      console.log(`[${timelog}]'html' or 'src' folder missing in: ${directory}`);
      console.log(`[${timelog}]init copy of ${directory}`);
      copyDirectories();
    }

  });
}

/** Create new Project */

function createNewProject() {
  console.log(`destination folder  ${destination} `);
  console.log(`source folder  ${source} `);

  
  fs.readdir(destination, (err, files) => {
    if (err) {
      console.error(`Error reading directory ${destination}: ${err}`);
      log(err);
      return;
    }

    if (files.includes('html') && files.includes('src')) { 
      console.log(`[${timelog}]Both 'html' and 'src' folders found in: ${destination}.`);
      console.log(`[${timelog}]Instead use update option`);
      log('folder already available');
    }else {
      console.log(`[${timelog}]'html' or 'src' folder missing in: ${destination}`);
      console.log(`[${timelog}]init copy of ${destination}`);
      console.log(`[${timelog}]*** Make sure you install Gulp globally for it to work by installing $npm install gulp --global`);
      copyDirectories();
      createSymLink();
    }
  });
}

/** Copy Directory */

function copyDirectories() {
    const directories = ['html', 'src'];
  
    directories.forEach((directoryName) => {
      const sourceDir = path.join(source, directoryName);
      const destinationDir = path.join(destination, directoryName);
  
        fs.copy(sourceDir, destinationDir, (err) => {
          if (err) {
            console.error(`[${timelog}]Error copying directory '${directoryName}':`, err);
          } else {
            console.log(`[${timelog}]Directory '${directoryName}' copied successfully.`);
          }
        });
      
    });
}

/** Copy file */

function copyFile(filename){

  // Define the paths for the source file and the destination file
const sourceFilePath = source + filename;
const destinationFilePath = destination + filename;

console.log(sourceFilePath);
console.log(destinationFilePath);

}

/** Create symlink */

function createSymLink(){
  
    const sourcePath = path.join(sourceSymLink , 'gulpfile.js');
    const symlinkPath = path.join(destination, 'gulpfile.js');
  
   
    console.log('Creating Gulp Symlink');
    console.log('Path Information');
    console.log('Destination: ' + destination);
    console.log('Symlink: ' + symlinkPath);
    console.log('Source: ' + sourcePath);
    
  
    if (!fs.existsSync(symlinkPath)) {
      fs.symlink(sourcePath, symlinkPath, 'file', (err) => {
        if (err) {
          console.log(`[${timelog}] Error Return Shortcut Already Exist.`);
          console.error(`[${timelog}] Error Creating Symlink to Gulp:, ${err}`);
          log(err);
        } else {
          console.log(`[${timelog}] Symlink Created Successfully.`);
          log('symlink created')
        }
      });
    } else {
      console.log(`[${timelog}]*** Link was not Copied!! Gulp Link Already Exists!!.`);
      log('existing link link was not created');
    }
}

/** Remove Symlink */

function removeSymLink() {

    const symlinkPath = path.join(destination, 'gulpfile.js');
    console.log(symlinkPath);

    if (fs.existsSync(symlinkPath)) {
       
      fs.unlink(symlinkPath, (err) => {
          if (err) {
            console.error(`[${timelog}] ${err}`);
            log(err);
          } else {
            console.log(`[${timelog}]*Gulp Symlink Removed Successfully.`);
            log('remove symlink');
          }
      });
        
    }else {
        console.log(`[${timelog}]*** Link was not Removed as Gulp Link is Not Available`);
        log('missing gulp link');
    }
   

}

/** Function Display Menu */

function displayMenu() {
  console.log('=== Menu ===');
  console.log('1. New Project');
  console.log('2. Create Gulp Link');
  console.log('3. Remove Gulp Link');
  console.log('4. Update');
  console.log('5. Exit');
}


/** Promt Options */
function handleOption(option) {
    switch (option) {
        case '1':
            console.log(`[${timelog}]You selected to create *New Project`);
            createNewProject();

            rl.close();
            break;

        case '2':
            console.log(`[${timelog}]Creating Gulp Link`);
            createSymLink();
            
            rl.close();
            break;

        case '3':
      
            console.log(`[${timelog}]Removing Gulp Link`);
            removeSymLink() 
            
            rl.close();
            break;

        case '4':

            console.log(`[${timelog}]Option Not Available Yet`);
           
            rl.close();
            break;
       
        case '5':
            console.log(`[${timelog}]Exit Thank you!`);
            log('exit');
            rl.close();
            break;
        default:
            console.log(`[${timelog}]***Invalid option. Please select a valid option.`);
            log('invalid option')
            rl.close();
            break;
    }
  }

  /** Get Choice with the questions */
  
  function getMenuChoice() {
    rl.question('Enter the option of your choice: ',  handleOption);

  }

  // Start the menu
displayMenu();
getMenuChoice();