'use strict';
const path = require("path");
const fs = require("fs-extra");
const logErr = require('../../../utils/TimeLogger');
const config = require('../../../config/configLoader');


/**
 * Event Handler
 * Provides error handling utilities for file system operations
 */

class Handler {

    /**
     * Validates that required parameters are provided
     * @param {string} param - The parameter value to validate
     * @param {string} paramName - The name of the parameter
     * @throws {Error} If parameter is invalid
     */
    #validateParam(param, paramName) {
        if (param === undefined || param === null) {
            throw new Error(`Missing required parameter: ${paramName}`);
        }
        if (typeof param !== 'string' || param.trim() === '') {
            throw new Error(`Invalid parameter ${paramName}: must be a non-empty string`);
        }
    }

    /**
     * Handle the file delete with proper error handling
     * @param {string} file - Source file path
     * @param {string} src - Source directory
     * @param {string} dest - Destination directory
     * @returns {Promise<boolean>} Success status
     */
    async handlerOnDeleteFile(file, src, dest) {
        try {
            // Validate input parameters
            this.#validateParam(file, 'file');
            this.#validateParam(src, 'src');
            this.#validateParam(dest, 'dest');

            console.log("... On Delete > ", file);
            const relativePath = path.relative(src, file);
            const destFile = path.join(dest, relativePath);

            await fs.remove(destFile);
            console.log("Removed File Success, Path:", destFile);
            return true;
        } catch (err) {
            const errorMessage = `Handler delete file failed: ${err.message}`;
            logErr.writeLog(err, { customKey: 'Handler delete file failed', context: { file, src, dest } });
            console.error("Error deleting file:", err.message);
            return false;
        }
    }

    /**
     * Handle the file delete with destination path
     * @param {string} destFile - Destination file path
     * @returns {Promise<boolean>} Success status
     */
    async handlerSetOnDeleteFile(destFile) {
        try {
            // Validate input parameter
            this.#validateParam(destFile, 'destFile');

            await fs.remove(destFile);
            console.log("Removed File Success, Path:", destFile);
            return true;
        } catch (err) {
            const errorMessage = `Handler set on delete file failed: ${err.message}`;
            logErr.writeLog(err, { customKey: 'Handler set on delete file failed', context: { destFile } });
            console.error("Error removing file:", err.message);
            return false;
        }
    }

    /**
     * Handle the Directory Add with proper error handling
     * @param {string} dir - Source directory
     * @param {string} src - Source base path
     * @param {string} dest - Destination base path
     * @returns {Promise<boolean>} Success status
     */
    async handlerOnDirAdd(dir, src, dest) {
        try {
            // Validate input parameters
            this.#validateParam(dir, 'dir');
            this.#validateParam(src, 'src');
            this.#validateParam(dest, 'dest');

            console.log("... On Dir Created > ", dir);

            const relativePath = path.relative(src, dir);
            const destFile = path.join(dest, relativePath);

            await fs.ensureDir(destFile);
            console.log(".... Dir Created >", destFile);
            return true;
        } catch (err) {
            logErr.writeLog(err, { customKey: 'Handler on DIR add error', context: { dir, src, dest } });
            console.error("Error creating directory:", err.message);
            return false;
        }
    }

    /**
     * Handle on DIR delete
     * @param {string} dir - Directory to delete
     * @param {string} src - Source base path
     * @param {string} dest - Destination base path
     * @returns {Promise<boolean>} Success status
     */
    async handlerOnDirDelete(dir, src, dest) {
        try {
            // Validate input parameters
            this.#validateParam(dir, 'dir');
            this.#validateParam(src, 'src');
            this.#validateParam(dest, 'dest');

            console.log("... On Dir Deleted > ", dir);
            const relativePath = path.relative(src, dir);
            const destDir = path.join(dest, relativePath);

            await fs.remove(destDir);
            console.log("Removed Dir Success, Path:", destDir);
            return true;
        } catch (err) {
            logErr.writeLog(err, { customKey: 'Handler on DIR delete error', context: { dir, src, dest } });
            console.error("Error deleting directory:", err.message);
            return false;
        }
    }

    /**
     * Handle errors with proper classification
     * @param {Error} err - Error object
     */
    handlerError(err) {
        if (!err) {
            console.error("handlerError called with no error object");
            return;
        }

        const errorContext = {
            code: err.code,
            message: err.message,
            stack: err.stack
        };

        if (err.code === 'EPERM') {
            logErr.writeLog(err, { customKey: 'Permission error', context: errorContext });
            console.error("Permission Error:", err.message);
        } else if (err.code === 'ENOENT') {
            logErr.writeLog(err, { customKey: 'File not found error', context: errorContext });
            console.error("File Not Found Error:", err.message);
        } else if (err.code === 'ENOTDIR') {
            logErr.writeLog(err, { customKey: 'Not a directory error', context: errorContext });
            console.error("Not a Directory Error:", err.message);
        } else {
            logErr.writeLog(err, { customKey: 'Error watching files', context: errorContext });
            console.error("Error:", err.message);
        }
    }

    /**
     * This method checks if a file exists.
     * @param {string|string[]} filePath - The path to the file or array of paths.
     * @returns {Promise<boolean>} Returns true if all files exist
     */
    async fileExistsSync(filePath) {
        try {
            if (!filePath) {
                throw new Error('filePath parameter is required');
            }

            if (Array.isArray(filePath)) {
                for (const file of filePath) {
                    const fileSrc = path.join(config.settings.mainfolder, file);
                    if (!fs.existsSync(fileSrc)) {
                        return false;
                    }
                }
                return true;
            } else {
                return fs.existsSync(filePath);
            }
        } catch (err) {
            logErr.writeLog(err, { customKey: 'File exist checker error', context: { filePath } });
            console.error("Error checking file existence:", err.message);
            return false;
        }
    }

    /**
     * This method checks if a directory exists.
     * @param {string} dirPath - The path to the directory.
     * @returns {boolean}
     */
    directoryExists(dirPath) {
        try {
            if (!dirPath) {
                throw new Error('dirPath parameter is required');
            }
            if (typeof dirPath !== 'string') {
                throw new Error('dirPath must be a string');
            }
            return fs.existsSync(dirPath) && fs.lstatSync(dirPath).isDirectory();
        } catch (err) {
            logErr.writeLog(err, { customKey: 'Directory existence check error', context: { dirPath } });
            console.error("Error checking directory existence:", err.message);
            return false;
        }
    }
}

const handler = new Handler();
Object.freeze(handler);

module.exports = handler;