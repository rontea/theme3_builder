#!/usr/bin/env node
'use strict';
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const logErr = require('../func/utils/TimeLogger');
const { exec } = require('child_process');
const path = require('path');

// Available commands for display
const commands = [
    { name: 'version', desc: 'Check current version' },
    { name: 'new-project', desc: 'Create new Project folder [html, src]' },
    { name: 'set-config', desc: 'Create config for edit [config/config.js]' },
    { name: 'clean-build', desc: 'Clean build folder' },
    { name: 'clean', desc: 'Clean build folder' },
    { name: 'dir-check', desc: "Check DIR's Environment (use --env, --config, --dirchk, --dir, --dircomp)" },
    { name: 'css-compile', desc: 'Compile list of CSS and SCSS' },
    { name: 'css-build', desc: 'Build CSS' },
    { name: 'scss-build', desc: 'Build SCSS' },
    { name: 'css-watch', desc: 'Watch CSS' },
    { name: 'js-compile', desc: 'Compile list of JS' },
    { name: 'js-build', desc: 'Build JS' },
    { name: 'js-watch', desc: 'Watch JS' },
    { name: 'html-build', desc: 'Build HTML' },
    { name: 'html-watch', desc: 'Watch HTML' },
    { name: 'img-build', desc: 'Build images' },
    { name: 'img-watch', desc: 'Watch images' },
    { name: 'icons-compile', desc: 'Compile icons' },
    { name: 'build-init', desc: 'Build HTML, SCSS, CSS, JS, and Images' },
    { name: 'watch', desc: 'Watch HTML, Images, CSS, and JS' },
    { name: 'icons-fontawesome', desc: 'Compile icons fontawesome' },
    { name: 'icons-bootstrap', desc: 'Compile icons bootstrap' },
    { name: 'move-res', desc: 'Move resources folder or file to build based on dest' },
    { name: 'builder', desc: 'Launch Visual Drag-and-Drop Builder (use --port to specify port, --open to auto-open browser)' }
];

function showHelp() {
    console.log('\nTheme_3 CLI - Available Commands:\n');
    console.log('Usage: th3 <command> [options]\n');
    console.log('Commands:');
    commands.forEach(cmd => {
        console.log(`  ${cmd.name.padEnd(20)} ${cmd.desc}`);
    });
    console.log('\nOptions:');
    console.log('  -h, --help               Show help');
    console.log('\nExample:');
    console.log('  th3 builder              Launch visual builder');
    console.log('  th3 builder --port 8080  Launch builder on port 8080');
    console.log('  th3 build-init           Build all assets\n');
}

try {
/**npx git-cz */

const rawArgs = process.argv.slice(2);
const wantsHelp =
    rawArgs.length === 0 ||
    rawArgs.includes('-h') ||
    rawArgs.includes('--help') ||
    rawArgs[0] === 'help' ||
    rawArgs[0] === 'list';

if (wantsHelp) {
    showHelp();
    process.exit(0);
}

const {projectFolders , setConfig} = require('./tasks/createProject');
const { compileCss , buildCss, buildScss
    , buildFontawesomeCss, buildBootstrapIconsCss
    , watchCss } = require('./tasks/cssTasks');
const {  compileJs , buildJs, buildJsFontawesome
    , watchJs } = require('./tasks/jsTasks');
const utils = require('../func/gulp/classes/Utils');
const {  buildHtml , watchHtml } = require('./tasks/htmlTasks');
const {  buildImages, watchImages } = require('./tasks/imageTasks');
const { moveBootstrapIcons, moveFontawesomeIcons
    , compileIcons} = require('./tasks/iconTasks');
const { moveResources } = require('./tasks/resourcesTasks');
const BuilderTask = require('../func/gulp/classes/BuilderTask');
//const { createGulpSymlink , unlinkGulpSymlink } = require('./tasks/symlinkGulpFile');
const {fileLister , checkEnv ,  checkConfigSync
    , checkDirCurrentSync, compareDir} = require('./tasks/projectHelper');

yargs(hideBin(process.argv))
.scriptName("th3")
.usage('$0 <cmd> [args]')
.help(false)
.version(false)
.demandCommand(1 , "You need to specify at least one command")
.command('list', 'List all available commands', () => {}, (argv) => {
    showHelp();
})
.command('help', 'Show help information', () => {}, (argv) => {
    showHelp();
})
.command('version', "Check current version", () => {}, () => {
  console.log("2.0.0");
})
.command('new-project', "Create new Project folder [html , src]", async () => {
   projectFolders();
})
.command('set-config', "Create config for edit [config/config.js]", async () => {
   setConfig();
 })
 /*
 .command('gulplink' , "Link or Unlink Gulpfile" , (yargs) => {
    return yargs
        .option('create' , {
            alias: 'c',
            type: 'boolean',
            description: "Create symlink for Gulpfile"
        })
        .option('unlink' , {
            alias: 'u',
            type: 'boolean',
            description: "Unlink symlink for Gulpfile"
        })
}, (argv) => {

    if(argv.create) {
       createGulpSymlink();
    } else if(argv.unlink) {
       unlinkGulpSymlink();
    }else {
        console.log("Command not available");
    }
}) */
.command('clean-build', "Clean build folder", async () => {
    utils.utilsCleanSync();
})
.command('clean', "Clean build folder", async () => {
    utils.utilsCleanSync();
})
.command('dir-check' , "Check DIR's Enviroment" , (yargs) => {
    return yargs
        .option('env' , {
            alias: 'e',
            type: 'boolean',
            description: "Check Enviroment"
        })
        .option('config' , {
            alias: 'c',
            type: 'boolean',
            description: "Check config"
        })
        .option('dirchk' , {
            alias: 'd',
            type: 'boolean',
            description: "Check filelister dir set in config"
        })
        .option('dir' , {
            alias: 'i',
            type: 'boolean',
            description: "Check DIR of current project"
        }).option('dircomp' , {
            alias: 'r',
            type: 'boolean',
            description: "Compare Dir's from source A and B"
        })

}, (argv) => {

    if(argv.env) {
      checkEnv();
    }
    else if(argv.config) {
       checkConfigSync();
    } else if(argv.dirchk) {
        fileLister();
    }else if(argv.dir) {
      checkDirCurrentSync();
    }else if(argv.dircomp){
        compareDir();
    }
    else {
        console.log("Command not available");
    }
})
.command('css-compile' , "Compile list of CSS and SCSS", () => {
  compileCss();
})
.command('css-build' , "Build CSS", () => {
  buildCss();
})
.command('scss-build' , "Build SCSS", () => {
  buildScss();
})
.command('css-watch' , "Watch CSS", () => {
  watchCss();
})
.command('js-compile' , "Compile list of JS", () => {
 compileJs();
})
.command('js-build' , "Build JS", () => {
 buildJs();
})
.command('js-watch' , "Watch JS", () => {
 watchJs();
})
.command('html-build' , "Build HTML", () => {
    buildHtml();
})
.command('html-watch' , "Watch HTML", () => {
    watchHtml();
})
.command('img-build' , "Build images", () => {
    buildImages();    
})
.command('img-watch' , "Watch images", () => {
    watchImages();    
})
.command('icons-compile' , "Compile icons", () => {
   compileIcons();    
})
.command('build-init' , "Build HTML, SCSS, CSS, JS, and Images", async () => {
    buildHtml(); buildScss(); buildCss(); buildJs(); buildImages();
})
.command('watch' , "Watch HTML, Images, CSS, and JS", async () => {
    watchHtml(); watchImages(); watchCss(); watchJs();
})
.command('icons-fontawesome' , "Compile icons fontawesome", async () => {
        buildFontawesomeCss();
        buildJsFontawesome();
        moveFontawesomeIcons();
})
.command('icons-bootstrap' , "Compile icons bootstrap", async () => {
    buildBootstrapIconsCss();
    moveBootstrapIcons();
})
.command('move-res' , "Move resources folder or file to build based on dest", async () => {
    moveResources();    
})
.command('builder' , "Launch Visual Drag-and-Drop Builder", (yargs) => {
    return yargs
        .option('port' , {
            alias: 'p',
            type: 'number',
            description: "Port for builder server",
            default: 3000
        })
        .option('open' , {
            alias: 'o',
            type: 'boolean',
            description: "Open browser automatically",
            default: true
        })
}, async (argv) => {
    try {
        console.log("\n🎨 Starting Theme_3 Visual Builder...\n");

        const builder = new BuilderTask({
            port: argv.port,
            partialsPath: path.resolve(process.cwd(), 'html/partials'),
            layoutsPath: path.resolve(process.cwd(), 'html/layouts'),
            builderPath: path.resolve(__dirname, '../_builder/client')
        });

        // Start the server
        await builder.startServer();

        // Open browser automatically if option is set
        if (argv.open) {
            const openModule = await import('open');
            const open = openModule.default || openModule.open;
            if (typeof open !== 'function') {
                throw new TypeError('open is not a function');
            }
            await open(`http://localhost:${argv.port}`);
        }

        // Handle graceful shutdown
        process.on('SIGINT', async () => {
            console.log('\n\nShutting down builder...');
            await builder.stopServer();
            process.exit(0);
        });

    } catch (err) {
        console.error('Failed to start builder:', err);
        logErr.writeLog(err, { customKey: 'BUILDER_START_ERROR' });
        process.exit(1);
    }
})
.fail((msg, err, yargs) => {

    if (err) throw err; 
    console.error('Error:', msg);
    showHelp();
    process.exit(1);
})
.argv;

}catch(err){
    logErr.writeLog(err , {customKey: 'CLI Issue detected'});
}
