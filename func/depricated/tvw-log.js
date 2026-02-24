const fs = require('fs');

// Function to write log to a file
function writeLog(logMessage) {
    // Get current date and time
    const timestamp = new Date().toISOString();
    const logDirectory = './logs';
    const logFile = './logs/log.log';

    // Format log message with timestamp
    const formattedLog = `[${timestamp}] ${logMessage}\n`;

            // Check if log directory exists
        if (!fs.existsSync(logDirectory)) {
            // Create log directory if it doesn't exist
            fs.mkdirSync(logDirectory);
        }else {
            
        }

    // Append log message to a file
    fs.appendFile(logFile, formattedLog, (err) => {
        if (err) {
        console.error('Error writing to log file:', err);
        }
    });
}

module.exports = writeLog;