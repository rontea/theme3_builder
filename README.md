# theme_3

> **Warning**
> This is a Beta version 0.0.0-beta version
> You can test this release.

A command-line interface (CLI) tool to manage and build web projects efficiently.

> **Warning**
> This build is currently on Beta.

#### Version 2.0.0-dev.1 What's New

- ** Under Development  Documentation **
- CLI th3 
- Gulpfile.js removed
- Extend list of keys in config.js
- Manipulate config.js 
- Expand gulpfile for extend commands

#### NPM : 
- [npm](https://www.npmjs.com/package/theme_3)
#### GitHub : 
- [git](https://github.com/rontea/theme_3)


#### Installation

```node
npm init
npm i theme_3
npm install
th3 - List all commands
```

#### Link CLI if needed

Add bin of theme_3 on package.json so that the CLI will work

```json
  "bin": {
    "th3": "./node_modules/theme_3/bin/cli.js"
  }
```

```node
npm link
```

#### Updated Commands

- Move to CLI and set gulpfiles optional for commands

```node
th3 <cmd> [args]
```
### Commands

| Command                | Description                                    |
|------------------------|------------------------------------------------|
| `th3 version`          | Check current version                          |
| `th3 new-project`      | Create new Project folder [html, src]          |
| `th3 set-config`       | Create config for edit [config/config.js]      |
| `th3 clean-build`      | Clean build folder                             |
| `th3 clean`            | Clean build folder                             |
| `th3 dir-check`        | Check DIR's Enviroment                         |
| `th3 css-compile`      | Compile list of CSS and SCSS                   |
| `th3 css-build`        | Build CSS                                      |
| `th3 scss-build`       | Build SCSS                                     |
| `th3 css-watch`        | Watch CSS                                      |
| `th3 js-compile`       | Compile list of JS                             |
| `th3 js-build`         | Build JS                                       |
| `th3 js-watch`         | Watch JS                                       |
| `th3 html-build`       | Build HTML                                     |
| `th3 html-watch`       | Watch HTML                                     |
| `th3 img-build`        | Build images                                   |
| `th3 img-watch`        | Watch images                                   |
| `th3 icons-compile`    | Compile icons                                  |
| `th3 build-init`       | Build HTML, SCSS, CSS, JS, and Images          |
| `th3 watch`            | Watch HTML, Images, CSS, and JS                |
| `th3 icons-fontawesome`| Compile icons fontawesome                      |
| `th3 icons-bootstrap`  | Compile icons bootstrap                        |
| `th3 move-res`         | Move resources folder or file to build based on dest |  

##### Samples
```
```


### Check DIR's Environment

#### `th3 dir-check [args]`

| Option         | Description                                    |
|----------------|------------------------------------------------|
| `-e`, `--env`  | Check Environment                              |
| `-c`, `--config`| Check config                                  |
| `-d`, `--dirchk`| Check `filelister` dir set in config          |
| `-i`, `--dir`   | Check DIR of current project                  |
| `-r`, `--dircomp`| Compare Dir's from source A and B            |

##### Samples
```
```

### CSS Compilation Commands

#### `th3 css-compile [args]`

| Key              | Description                          |
|------------------|--------------------------------------|
| `--css`            | Compile CSS on `[src/css]`           |
| `--scss`           | Compile SCSS on `[src/scss]`         |
| `--bootstrap`      | Compile Bootstrap to CSS             |
| `--bootstrapIcon`  | Compile Bootstrap Icon CSS           |
| `--fontawesome`    | Compile FontAwesome Icon CSS         |
| `--bulma`          | Compile Bulma to CSS                 |
| `--prism`          | Compile Prism CSS                    |

### CSS Utilities

#### `th3 css-compile [args] [utilities] [value]`

| Key            | Description                          |
|----------------|--------------------------------------|
| `--dest`         | Alter Destination                    |
| `--compress`     | Compress CSS                         |
| `--autoprefixer` | Add autoprefixer value (1-5)         |
| `--list`         | List available keys                  |

##### Samples
```
```
### JS Compilation Commands

#### `th3 js-compile [args]`

| Key            | Description                          |
|----------------|--------------------------------------|
| `--js`           | Compile JS on `[src/js]`             |
| `--jquery`       | Compile jQuery                       |
| `--popper`       | Compile Popper JS                    |
| `--tether`       | Compile Tether JS                    |
| `--bootstrap`    | Compile Bootstrap JS                 |
| `--fontawesome`  | Compile FontAwesome icons JS         |

### JS Utilities

#### `th3 js-compile [args] [utilities] [value]`

| Key        | Description                          |
|------------|--------------------------------------|
| `--dest`     | Alter Destination                    |
| `--uglify`   | Uglify JS                            |
| `--list`     | List available keys                  |

##### Samples
```
```
### Icons Compilation Commands

#### `th3 icons-compile [args]`

| Key            | Description                           |
|----------------|---------------------------------------|
| `--fontawesome`  | Compile FontAwesome icons fonts       |
| `--bootstrap`    | Compile Bootstrap icons fonts         |

### Icons Utilities

#### `th3 icons-compile [args] [utilities] [value]`

| Key        | Description                           |
|------------|---------------------------------------|
| `--dest`     | Alter Destination                     |
| `--list`     | List available keys                   |

##### Samples
```
```

##### More Resources 

#### `th3 move-res [args]`

| Key        | Description                           |
|------------|---------------------------------------|
| `--dest`   | Source of file or folder            |
| `--src`    | Destination of file or folder       |
| `--list`   | List available keys                 |


##### Help options

#### `th3 [args]`
#### `th3 <cmd> [args]`

| Option         | Description                                    |
|----------------|------------------------------------------------|
| `--version`    | Show version number                            |
| `-h`, `--help` | Show help                                      |

##### Samples
```
```

### Getting Started

##### Samples
```
```

## Build Folder
  - This folder will be created once compile has been made

   ```
    . /build
    ├── css                     # CSS includes
    ├── img                     # images
    │── js                      # JS
    │
      Pages       
   ```
- Src : Edit CSS/SASS , JS , Images
- html : organize your html codes using ["panini"](https://www.npmjs.com/package/panini)
  - layout (html): default html initial
  - pages (body): resides the index.html and other pages
  - partials : blocks of your page
    - Panini Syntax ["Link"](https://get.foundation/sites/docs/panini.html)

## Link to Coding Standards

- https://en.bem.info/methodology/
- https://google.github.io/styleguide/htmlcssguide.html#HTML_Formatting_Rules
- https://github.com/xfiveco/html-coding-standards/blob/master/README.md
- https://cssguidelin.es/#the-importance-of-a-styleguide
- https://github.com/necolas/idiomatic-css#general-principles

## Resources
- [gulp](https://riptutorial.com/gulp/topic/1341/getting-started-with-gulp)
- [jQuery](https://jquery.com)
- [Bootstrap](https://getbootstrap.com/)
- [node](https://nodejs.org/en/)
- [npm](https://www.npmjs.com/)
- [gulp](https://gulpjs.com/)
- [panini](https://foundation.zurb.com/sites/docs/panini.html)
  - [Playlist](https://www.youtube.com/playlist?list=PLJVWPVPk_D_3A4OBvLtsrcjL7gs1QEWLW)
- [Bulma](https://bulma.io/)
- [Prism](https://prismjs.com/index.html)
## Other

- Readme.md Guide Template [Readme.md](https://gist.github.com/PurpleBooth/109311bb0361f32d87a2)
- Readme.md Format [https://guides.github.com/features/mastering-markdown/](https://guides.github.com/features/mastering-markdown/)

## Bugs and feature requests
Error logs are created under logs/log.log , you can report error/bugs [here](https://github.com/rontea/theme_3/issues)
