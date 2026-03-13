'use strict';

const fs = require('fs');
const path = require('path');
const logErr = require('../utils/TimeLogger');

try {

    // Define the default and main project config paths
    const defaultConfigPath = path.join(__dirname, './config.js');
    const mainConfigPath = path.join(process.cwd(), 'config', 'config.js');
   
    // Load the config file from the main project directory if it exists
    if (!fs.existsSync(mainConfigPath)) {
        try {
            fs.mkdirSync(path.dirname(mainConfigPath), { recursive: true });
            fs.copyFileSync(defaultConfigPath, mainConfigPath);
            console.warn(`[th3] Created missing config at ${mainConfigPath}`);
        } catch (copyErr) {
            logErr.writeLog(copyErr, {
                customKey: 'Config bootstrap failed',
                context: { mainConfigPath, defaultConfigPath }
            });
            throw copyErr;
        }
    }

    const configPath = fs.existsSync(mainConfigPath) ? mainConfigPath : defaultConfigPath;
    const config = require(configPath);

    module.exports = config;

}catch(err) {
    logErr.writeLog(err , {customKey: 'Erron on config loader'});
    throw err;
}
