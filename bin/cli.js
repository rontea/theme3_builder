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
    { name: 'builder', desc: 'Launch Visual Drag-and-Drop Builder (use --port to specify port, --open to auto-open browser)' },
    { name: 'cms', desc: 'Run Theme CMS commands (serve, export, migrate-content)' },
    { name: 'theme', desc: 'Run Theme package commands (export)' }
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
    console.log('  th3 cms export           Publish CMS JSON bridge files');
    console.log('  th3 theme export         Generate a portable theme package');
    console.log('  th3 cms migrate-content  Seed Phase 5 CMS collections/entries');
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
const configLoader = require('../func/config/configLoader');
//const { createGulpSymlink , unlinkGulpSymlink } = require('./tasks/symlinkGulpFile');
const {fileLister , checkEnv ,  checkConfigSync
    , checkDirCurrentSync, compareDir} = require('./tasks/projectHelper');

const DEFAULT_BUILDER_PORT = 3000;
const DEFAULT_CMS_PORT = 3100;

function parsePort(value, source, strict = false) {
    if (value === undefined || value === null || value === "") {
        return undefined;
    }

    const port = Number(value);
    if (Number.isInteger(port) && port > 0 && port <= 65535) {
        return port;
    }

    const message = `${source} must be a whole number between 1 and 65535`;
    if (strict) {
        throw new Error(message);
    }

    console.warn(`[th3] Ignoring invalid builder port: ${message}`);
    return undefined;
}

function resolveBuilderPort(cliPort) {
    return parsePort(cliPort, "--port", cliPort !== undefined)
        ?? parsePort(configLoader.builder?.port, "config.builder.port")
        ?? parsePort(process.env.TH3_BUILDER_PORT, "TH3_BUILDER_PORT")
        ?? DEFAULT_BUILDER_PORT;
}

function resolveCmsPort(cliPort) {
    return parsePort(cliPort, "--port", cliPort !== undefined)
        ?? parsePort(configLoader.cms?.port, "config.cms.port")
        ?? parsePort(process.env.TH3_CMS_PORT, "TH3_CMS_PORT")
        ?? DEFAULT_CMS_PORT;
}

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
            description: "Port for builder server"
        })
        .option('open' , {
            alias: 'o',
            type: 'boolean',
            description: "Open browser automatically",
            default: true
        })
        .option('cms-read-mode', {
            type: 'string',
            choices: ['export', 'live'],
            default: 'export',
            description: "How builder reads CMS data: exported bridge files or live CMS API"
        })
        .option('cms-base-url', {
            type: 'string',
            default: '',
            description: "Base URL for live CMS API reads, for example http://localhost:3100"
        })
        .option('cms-admin-url', {
            type: 'string',
            default: 'http://localhost:3100/cms',
            description: "URL opened by the builder CMS button"
        })
}, async (argv) => {
    try {
        console.log("\n🎨 Starting Theme_3 Visual Builder...\n");
        const builderPort = resolveBuilderPort(argv.port);

        const builder = new BuilderTask({
            port: builderPort,
            partialsPath: path.resolve(process.cwd(), 'html/partials'),
            layoutsPath: path.resolve(process.cwd(), 'html/layouts'),
            builderPath: path.resolve(__dirname, '../_builder/client'),
            cmsReadMode: argv.cmsReadMode,
            cmsBaseUrl: argv.cmsBaseUrl,
            cmsAdminUrl: argv.cmsAdminUrl
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
            await open(`http://localhost:${builderPort}`);
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
.command('cms <action>', "Run Theme CMS commands", (yargs) => {
    return yargs
        .positional('action', {
            describe: "CMS action to run",
            choices: ["serve", "export", "migrate-content"]
        })
        .option('port', {
            alias: 'p',
            type: 'number',
            description: "Port for `cms serve`"
        })
        .option('project-root', {
            type: 'string',
            default: process.cwd(),
            description: "Project root used to resolve theme-cms and html/data/cms paths"
        })
        .option('open', {
            alias: 'o',
            type: 'boolean',
            default: false,
            description: "Open CMS admin URL automatically (serve only)"
        })
        .option('output', {
            type: 'string',
            description: "Output folder for exported bridge files (export only)"
        })
        .option('preview', {
            type: 'boolean',
            default: false,
            description: "Also write export files under theme-cms/preview/data/cms (export only)"
        })
        .option('include-drafts', {
            type: 'boolean',
            default: false,
            description: "Include draft entries in export output"
        })
        .option('include-archived', {
            type: 'boolean',
            default: false,
            description: "Include archived entries in export output"
        })
        .option('skip-export', {
            type: 'boolean',
            default: false,
            description: "Skip export after migration (migrate-content only)"
        });
}, async (argv) => {
    const { startThemeCmsServer, createThemeCmsConfig, createCmsRepository, createCmsService } = require('../theme-cms/server');
    const projectRoot = path.resolve(String(argv.projectRoot || process.cwd()));

    if (argv.action === "serve") {
        try {
            const cmsPort = resolveCmsPort(argv.port);
            const defaultBuilderPort = resolveBuilderPort();
            const runtime = await startThemeCmsServer({
                port: cmsPort,
                projectRoot,
                cmsBaseUrl: `http://localhost:${cmsPort}`,
                cmsAdminUrl: `http://localhost:${cmsPort}/cms`,
                builderPreviewUrl: `http://localhost:${defaultBuilderPort}`
            });
            const cmsUrl = `http://localhost:${cmsPort}/cms`;
            console.log(`Theme CMS server started on ${cmsUrl}`);

            if (argv.open) {
                const openModule = await import('open');
                const open = openModule.default || openModule.open;
                if (typeof open === 'function') {
                    await open(cmsUrl);
                }
            }

            process.on('SIGINT', async () => {
                console.log('\n\nShutting down CMS server...');
                await runtime.repository.close();
                await new Promise((resolve) => runtime.server.close(resolve));
                process.exit(0);
            });
            return;
        } catch (err) {
            console.error('Failed to start CMS server:', err);
            logErr.writeLog(err, { customKey: 'CMS_START_ERROR' });
            process.exit(1);
        }
    }

    if (argv.action === "export") {
        const config = createThemeCmsConfig({
            projectRoot,
            exportDir: argv.output || undefined
        });
        const repository = createCmsRepository(config);
        const service = createCmsService(repository, { config });

        try {
            await repository.initSchema();
            const previewOutputPath = argv.preview
                ? path.join(config.previewPath, "data", "cms")
                : undefined;

            const result = await service.exportContent({
                includeDrafts: Boolean(argv.includeDrafts),
                includeArchived: Boolean(argv.includeArchived),
                outputPath: config.exportPath,
                previewOutputPath
            });

            console.log(`CMS export completed at ${result.generatedAt}`);
            console.log(`Primary output: ${result.targets[0].outputPath}`);
            console.log(`Manifest: ${result.manifestPath}`);
            if (result.targets.length > 1) {
                console.log(`Preview output: ${result.targets[1].outputPath}`);
            }
            console.log(`Exported collections: ${result.totals.collections}`);
            console.log(`Exported entries: ${result.totals.entries}`);
        } catch (err) {
            console.error('CMS export failed:', err);
            logErr.writeLog(err, { customKey: 'CMS_EXPORT_ERROR' });
            process.exitCode = 1;
        } finally {
            await repository.close();
        }
    }

    if (argv.action === "migrate-content") {
        const { phase5ContentSeed } = require('../theme-cms/seeds/phase5.content');
        const config = createThemeCmsConfig({
            projectRoot,
            exportDir: argv.output || undefined
        });
        const repository = createCmsRepository(config);
        const service = createCmsService(repository, { config });

        try {
            await repository.initSchema();
            const currentCollections = await service.listCollections();
            const collectionMap = new Map(currentCollections.map((item) => [item.slug, item]));
            const summary = {
                collectionsCreated: 0,
                collectionsUpdated: 0,
                entriesCreated: 0,
                entriesUpdated: 0
            };

            for (const collection of phase5ContentSeed.collections) {
                const existingCollection = collectionMap.get(collection.slug);
                if (existingCollection) {
                    await service.updateCollection(collection.slug, {
                        name: collection.name,
                        schema: collection.schema
                    });
                    summary.collectionsUpdated += 1;
                } else {
                    await service.createCollection({
                        slug: collection.slug,
                        name: collection.name,
                        schema: collection.schema
                    });
                    summary.collectionsCreated += 1;
                }

                const existingEntries = await service.listEntries(collection.slug);
                const entryMap = new Map(existingEntries.map((item) => [item.entryKey, item]));

                for (const entry of collection.entries) {
                    const payload = {
                        collection: collection.slug,
                        entryKey: entry.entryKey,
                        status: entry.status || "published",
                        sortOrder: Number.isFinite(Number(entry.sortOrder)) ? Number(entry.sortOrder) : 0,
                        data: entry.data || {}
                    };
                    const existingEntry = entryMap.get(entry.entryKey);
                    if (existingEntry) {
                        await service.updateEntry(existingEntry.id, payload);
                        summary.entriesUpdated += 1;
                    } else {
                        await service.createEntry(payload);
                        summary.entriesCreated += 1;
                    }
                }
            }

            console.log("Phase 5 content migration complete.");
            console.log(`Collections created: ${summary.collectionsCreated}`);
            console.log(`Collections updated: ${summary.collectionsUpdated}`);
            console.log(`Entries created: ${summary.entriesCreated}`);
            console.log(`Entries updated: ${summary.entriesUpdated}`);

            if (!argv.skipExport) {
                const previewOutputPath = argv.preview
                    ? path.join(config.previewPath, "data", "cms")
                    : undefined;
                const result = await service.exportContent({
                    includeDrafts: Boolean(argv.includeDrafts),
                    includeArchived: Boolean(argv.includeArchived),
                    outputPath: config.exportPath,
                    previewOutputPath
                });
                console.log(`Exported CMS bridge manifest: ${result.manifestPath}`);
            }
        } catch (err) {
            console.error('CMS content migration failed:', err);
            logErr.writeLog(err, { customKey: 'CMS_MIGRATION_ERROR' });
            process.exitCode = 1;
        } finally {
            await repository.close();
        }
    }
})
.command('theme <action>', "Run Theme package commands", (yargs) => {
    return yargs
        .positional('action', {
            describe: "Theme action to run",
            choices: ["export"]
        })
        .option('project-root', {
            type: 'string',
            default: process.cwd(),
            description: "Project root used to resolve CMS, builder, html, and theme paths"
        })
        .option('theme-name', {
            type: 'string',
            default: 'Theme 3',
            description: "Theme name written to theme.json"
        })
        .option('output', {
            type: 'string',
            description: "Output folder for the portable theme package"
        })
        .option('include-compiled-assets', {
            type: 'boolean',
            default: true,
            description: "Copy compiled/source CSS, JS, and images into assets/"
        })
        .option('include-fallback-data', {
            type: 'boolean',
            default: true,
            description: "Write CMS fallback data into data/fallback/"
        })
        .option('include-draft-bindings', {
            type: 'boolean',
            default: false,
            description: "Mark draft binding metadata as included"
        })
        .option('overwrite', {
            type: 'boolean',
            default: false,
            description: "Overwrite an existing theme export folder"
        });
}, async (argv) => {
    const { createThemeCmsConfig, createCmsRepository, createCmsService } = require('../theme-cms/server');
    const projectRoot = path.resolve(String(argv.projectRoot || process.cwd()));
    const config = createThemeCmsConfig({ projectRoot });
    const repository = createCmsRepository(config);
    const service = createCmsService(repository, { config });

    try {
        await repository.initSchema();
        const result = await service.exportTheme({
            themeName: argv.themeName,
            outputPath: argv.output,
            includeCompiledAssets: Boolean(argv.includeCompiledAssets),
            includeFallbackData: Boolean(argv.includeFallbackData),
            includeDraftBindings: Boolean(argv.includeDraftBindings),
            overwrite: Boolean(argv.overwrite)
        });

        console.log(`Theme export completed at ${result.generatedAt}`);
        console.log(`Output: ${result.outputPath}`);
        console.log(`Manifest: ${result.manifestPath}`);
        console.log(`Layouts: ${result.totals.layouts}`);
        console.log(`Templates: ${result.totals.templates}`);
        console.log(`Views: ${result.totals.views}`);
        console.log(`Bindings: ${result.totals.bindings}`);
        console.log(`Validation: ${result.validation.valid ? "valid" : "has errors"}`);
        if (result.validation.errors.length || result.validation.warnings.length) {
            [...result.validation.errors, ...result.validation.warnings].forEach((item) => {
                console.log(`- ${item.code}: ${item.message}`);
            });
        }
    } catch (err) {
        console.error('Theme export failed:', err);
        logErr.writeLog(err, { customKey: 'THEME_EXPORT_ERROR' });
        process.exitCode = 1;
    } finally {
        await repository.close();
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
    console.error('CLI failed:', err);
    logErr.writeLog(err , {customKey: 'CLI Issue detected'});
    process.exit(1);
}
