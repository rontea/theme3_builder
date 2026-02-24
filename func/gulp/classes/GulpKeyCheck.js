'use strict';
const config = require('../../config/configLoader');
const logErr = require('../../utils/TimeLogger.js');

class GulpKeyCheck {

    /**
     * Static method that will generate the keys coming from config file for JS.
    */

    static async checkJSKeySync(lang = "JS",type = "command") {
    
        console.log(`${lang} <cmd> [args]  $${type} :`);
        let prefix = "       ";  
        config.jspaths.paths.forEach(item => {
            console.log(` ${item.key}${prefix}`);
        });

        console.log(`${lang} Utilities $${type} :`);
        console.log(`   ${prefix}uglify`);
        console.log(`   ${prefix}dest `);

    }

    /**
     * Static method that will generate the keys coming from config file for CSS.
    */

    static async checkCSSKeySync(lang = "CSS",type = "command") {

        console.log(`${lang} $${type} [args]:`);
        
        config.csspaths.paths.forEach(item => {
            console.log( ` ${item.key} : ${item.descr}`);
        });

        console.log(`${lang} Utilities $${type} :`);
        console.log(`   compress `);
        console.log(`   autoprefixer (1-5) `);
        console.log(`   dest `);
        
    }

    /**
    * Static method that will generate the keys coming from config file for Icons.
    */

    static async checkIconsKeySync(lang = "Icons",type = "command") {

        console.log(`${lang} <cmd> [args]  $${type} :`);
        let prefix = "--"; 
        config.icons.paths.forEach(item => {
            console.log( ` ${prefix}${item.key}`);
        });

        console.log(`${lang} Utilities $${type} :`);
        console.log(`   ${prefix}dest `);
       
    }

    static async checkAll(
        keysReference = [{ key: "undefined",  path: "undefined" , descr: "undefined"}]
        ,lang = "undefined",type = "undefined"
        , additional = [{ key : "undefined" , descr : "undefined"}]) {
        
        try{

            console.log();
            console.log(`${lang} $${type} [args]:`);
            
            if(keysReference != ""){
                this.displayTable(keysReference);
            }
           
            console.log(`${lang} Utilities $${type} :`);
           
            this.displayTable(additional);

        }catch(err){
            logErr.writeLog(err , {customKey: 'Check all error'});
        }


    }

    static mapDescription(commands,descriptions) {

        try{

            const transformedCommands = commands.map(command => ({
                key: command,
                descr: descriptions[command] || "default description"
            }));
    
            return transformedCommands;

        }catch(err){
            logErr.writeLog(err , {customKey: 'Map destription error'});
        }

    }

    static async displayTable(data, excludeKeys = ["path"]) {

        try{

        let prefix = "--";

        console.log();
        const filteredData = data.map(item => {
            const newItem = { ...item };
            excludeKeys.forEach(key => delete newItem[key]);
            return newItem;
        });

        const headers = Object.keys(filteredData[0]);
        const columnWidths = headers.map(header => Math.max(header.length, ...filteredData.map(row => row[header].length)));
          
        // Print headers
        const headerRow = headers.map((header, i) => header.padEnd(columnWidths[i] + 5) ).join('');
        console.log(headerRow);
      
        // Print rows
        data.forEach(row => {
          const rowString = headers.map((header, i) => row[header].padEnd(columnWidths[i] + 5)).join('');
          console.log(`${prefix}${rowString}`);
        });
        console.log();

        }catch(err){
            logErr.writeLog(err , {customKey: 'diplay table error'});
        }
        
    }

}

module.exports = GulpKeyCheck;