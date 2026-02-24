'use strict';

const readline = require('readline');

class MenuBuilder {

    #menu;

    #displayTitle;

    #displayFooter;

    #optionCallbacks;

    #invalidMessage;

    #rl;
    
    /**
     * This will build the Menu
     * @param {string} display 
     * @param {string} menu 
    */

    constructor (display = {}, menu = {}) {

        this.#menu = menu;
        this.#displayTitle = display.title || "";
        this.#displayFooter = display.footer || "";

    }

    /**
     * Display the Menu based on costructor 
    */

    displayMenu() {

        let count = 1;

        console.log(this.#displayTitle);

        if(Array.isArray(this.#menu)){

            this.#menu.forEach(item => {

                console.log(`${count++}. ${item}`);

            });

        }else {
            console.log(this.#menu);
        }

        console.log(this.#displayFooter);
    }

    setHandleOptions(optionCallbacks = {}, 
        invalidMessage = "Invalid Message") {
        
        try {

            this.#rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout
            });

            this.#optionCallbacks = optionCallbacks;
            this.#invalidMessage = invalidMessage;
    
            this.#rl.question('Enter the option of your choice: ', (option) => this.handleOption(option));
    

        }catch(err) {
            console.log("rl init error " , err);
        }    
       
    }

    handleOption(option){
      
        try {
            const callback = this.#optionCallbacks[option];
            this.#rl.close();

            if(callback){
                callback();
            }else {
                console.log(this.#invalidMessage);
            }
        
        }catch(err) {
            console.log("handle option error " , err);
        }
        
    }

}

module.exports = MenuBuilder;