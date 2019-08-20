const cheerio = require('cheerio');
const path = require('path');
const crypto = require('crypto');
const UglifyJS = require("uglify-js");
const config = require(process.cwd()+ '/page-one-stop.config');
const CleanCSS = require('clean-css');
const {readFile, createDir, exists, writeFile} = require('./fileHelper');

let includeCache = new Map();

class HtmlHelper {


    constructor(html, basePath, htmlPath) {
        this.html = html;
        this.$ = cheerio.load(this.html);
        this.$('*[data-remove]').remove();
        this.basePath = basePath;
        this.htmlPath = htmlPath;
    }


    async includeTemplate() {
        if(config.debug){
            console.log('%s 开始处理模板引入', this.htmlPath);
        }
        let $includes = this.$('*[data-include]');
        for (let i = 0; i < $includes.length; i++) {
            let $item = this.$($includes.get(i));
            let include = $item.data('include');
            if(config.debug){
                console.log('模板引入节点', include);
            }
            let src = include.src;
            let templateFile = path.resolve(path.dirname(this.basePath), src);
            let template;
            if (includeCache.has(templateFile)) {
                template = includeCache.get(templateFile);
            } else {
                template = await readFile(templateFile);
                includeCache.set(templateFile, template);
            }
            switch (include.position || 'top') {
                case "top":
                    $item.before(template);
                    break;
                case 'bottom':
                    $item.after(template);
                    break;
                case 'inside-top':
                    $item.prepend(template);
                    break;
                case 'inside-bottom':
                    $item.append(template);
                    break;
            }
            $item.removeAttr('data-include');
        }
        if(config.debug){
            console.log('%s 结束处理模板引入', this.htmlPath);
        }

    }

    /**
     * 第一步 获取所有js标签并排除要分组整合后压缩
     * 第二步 获取所有分组js标签，分组压缩合并后输出到mix目录
     * @returns {Promise<void>}
     */
    async uglifyJavaScript() {
        if(config.debug){
            console.log('%s 开始处理JS合并压缩', this.htmlPath);
        }
        let scripts = this.$("script[src]").filter((index, item) => {
            let $item = this.$(item);
            return !$item.attr('data-group') && !/^(http|\\)/.test($item.attr('src'));
        }).map((index, item) => this.$(item).attr('src'));
        scripts = scripts.toArray();
        if(config.debug){
            console.log('%s 处理JS单文件压缩', scripts);
        }
        for (let script of scripts) {
            let scriptPath = path.resolve(path.dirname(this.basePath), script);
            let file = scriptPath.replace(config.src, path.resolve(__dirname, config.output));
            if (!await exists(file)) {
                let option = {};
                option[script] = await readFile(scriptPath);
                const mix = UglifyJS.minify(option);
                await createDir(file);
                await writeFile(file, mix.code);
            }
        }
        let groupScript = new Map();
        this.$("script[data-group]").each((index, item) => {
            let $item = this.$(item);
            let group = $item.attr("data-group");
            let src = $item.attr("src");
            groupScript.has(group) ? groupScript.get(group).push(src) : groupScript.set(group, [src]);
        });
        if(config.debug){
            console.log('处理JS分组压缩合并', groupScript);
        }
        let group = new Map();
        let keys = Array.from(groupScript.keys());
        for (let key of keys) {
            let items = groupScript.get(key);
            let files = items.map(file => {
                return path.resolve(path.dirname(this.basePath), file);
            });
            let fileJoin = files.sort().join('_');
            let fileName = crypto.createHash('md5').update(fileJoin, 'utf8').digest('hex');
            group.set(fileName, files);
            let mixPath = path.dirname(files[0]);
            // 得到从html 到 mix文件的相对路径
            let mixPathRelative = path.relative(path.dirname(this.htmlPath), mixPath).replace(/\\/, '/');
            let mixFileName = `${fileName}.mix.js`;
            this.$("script[data-group='" + key + "']").eq(0).before(this.$(`<script src="${mixPathRelative}/${mixFileName}"></script>`));
            this.$("script[data-group='" + key + "']").remove();
            let mixFile = path.join(mixPath, mixFileName);
            if (!await exists(mixFile)) {
                let option = {};
                for (let file of files) {
                    option[file] = await readFile(file);
                }
                const mix = UglifyJS.minify(option);
                await createDir(mixFile);
                await writeFile(mixFile, mix.code);
            }
            if(config.debug){
                console.log('处理JS分组压缩合并最终文件名：', mixFile);
            }
        }
        if(config.debug){
            console.log('%s 结束处理JS合并压缩', this.htmlPath);
        }
    }


    async minifyCss() {
        if(config.debug){
            console.log('%s 开始处理css合并压缩', this.htmlPath);
        }
        let links = this.$("link[rel='stylesheet']").filter((index, item) => {
            let $item = this.$(item);
            return !$item.attr('data-group') && !/^(http|\\)/.test($item.attr('href'));
        }).map((index, item) => this.$(item).attr('href'));
        links = links.toArray();
        if(config.debug){
            console.log('处理css单文件压缩', links);
        }
        const cleanCSSOption = Object.assign({inline: ['local']}, config.cleanCSS || {});

        for (let link of links) {
            let linkPath = path.resolve(path.dirname(this.basePath), link);
            let file = linkPath.replace(config.src, path.resolve(__dirname, config.output));
            if (!await exists(file)) {
                let output = new CleanCSS(Object.assign({rebaseTo: mixPath}, cleanCSSOption)).minify([linkPath]);
                await createDir(file);
                await writeFile(file, output.styles);
            }
        }
        let groupLink = new Map();
        this.$("link[data-group]").each((index, item) => {
            let $item = this.$(item);
            let group = $item.attr("data-group");
            let src = $item.attr("href");
            groupLink.has(group) ? groupLink.get(group).push(src) : groupLink.set(group, [src]);
        });
        if(config.debug){
            console.log('处理css分组文件压缩', groupLink);
        }
        let group = new Map();
        let keys = Array.from(groupLink.keys());
        for (let key of keys) {
            let items = groupLink.get(key);
            let files = items.map(file => {
                return path.resolve(path.dirname(this.basePath), file);
            });

            let fileJoin = files.sort().join('_');
            let fileName = crypto.createHash('md5').update(fileJoin, 'utf8').digest('hex');
            group.set(fileName, files);
            // 得到从html 到 mix文件的相对路径
            let mixPath = path.dirname(files[0]);
            let mixPathRelative = path.relative(path.dirname(this.htmlPath), mixPath).replace(/\\/, '/');
            let mixFileName = `${fileName}.mix.css`;
            this.$("link[data-group='" + key + "']").eq(0).before(this.$(`<link rel="stylesheet"  href="${mixPathRelative}/${mixFileName}">`));
            this.$("link[data-group='" + key + "']").remove();
            let mixFile = path.join(mixPath, mixFileName);
            if (!await exists(mixFile)) {
                let output = new CleanCSS(Object.assign({rebaseTo: mixPath}, cleanCSSOption)).minify(files);
                await createDir(mixFile);
                await writeFile(mixFile, output.styles);
            }
            if(config.debug){
                console.log('处理css分组压缩合并最终文件名：', mixFile);
            }
        }
    }




    toString() {
        return this.$.html();
    }


}

module.exports = HtmlHelper;