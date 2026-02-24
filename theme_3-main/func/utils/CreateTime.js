'use strict';

class CreateTime {

    /**
     * Create time with pad zero
     * @returns string
    */
    getTime() {
        const currentTime = new Date();

        const hours = this.padZero(currentTime.getHours());
        const minutes = this.padZero(currentTime.getMinutes());
        const seconds = this.padZero(currentTime.getSeconds());
        
        const timeString = `[${hours}:${minutes}:${seconds}]`;
        
        return timeString;
    
    }

    /**
     * Returns a string padding a number to a given length with zeros. 
     * @param {time} num 
     * @returns int
    */

    padZero(num) {
        return (num < 10 ? '0' : '') + num;
    }

}

const currentTime = new CreateTime();
Object.freeze(currentTime);

module.exports = currentTime;