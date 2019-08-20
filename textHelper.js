const config = require(process.cwd() + '/page-one-stop.config');
const {readFile, fileSize, writeFile, exists} = require('./fileHelper');
const crypto = require('crypto');
const path = require('path');
/**
 *
 * @type {{}}
 */

let fileMd5 = {};

let fileBase64 = {};

class TextHelper {


    constructor(basePath, text, next = false) {
        this.text = text;
        this.items = this.findUrlList();
        this.basePath = basePath;
    }


    async md5() {
        if (config.debug) {
            console.log(`${this.basePath}开始处理md5指纹逻辑！`);
        }
        let items = this.items.filter(item => !config.md5.test || config.md5.test.test(item));
        for (let item of items) {
            let url = path.resolve(path.dirname(this.basePath), item);
            if (!await exists(url)) {
                if (config.debug) {
                    console.log(`${url}文件路径不存在，已跳过MD5处理逻辑！`);
                }
                continue;
            }
            let value;
            if (fileMd5[url]) {
                if (config.debug) {
                    console.log(`${url}存在md5缓存，已应用！`);
                }
                value = fileMd5[url];
            } else {

                let text = await readFile(url);
                if (/\.css/.test(url)) {
                    text = await new TextHelper(url, text, false).md5();
                }
                value = crypto.createHash('md5').update(text).digest('hex');
                fileMd5[url] = value;
                if (config.debug) {
                    console.log(`${url}，MD5:${value}！`);
                }
            }
            this.text = this.text.replace(item, /\?/.test(item) ? `${item}&md5=${hex}` : `${item}?md5=${value}`);
        }
        await writeFile(this.basePath, this.text);
        return this.text;
    }

    async base64() {
        if (config.debug) {
            console.log(`${this.basePath}开始处理base64逻辑！`);
        }
        let items = this.items.filter(item => !config.base64.test || config.base64.test.test(item)).filter(item => !/\.css/.test(item));
        for (let item of items) {
            let url = path.resolve(path.dirname(this.basePath), item);
            let base64;
            if (fileBase64[url]) {
                if (config.debug){
                    console.log(`${url}已存在base64缓存，直接使用！`);
                }
                base64 = fileBase64[url];
            } else {
                if (!await exists(url)) {
                    continue;
                }
                let size = await fileSize(url);
                if (config.base64.maxSize && config.base64.maxSize < size) {
                    if (config.debug) {
                        console.log(`${url} size ：${size},大于base64配置值，跳过！`);
                    }
                    continue;
                }
                if (config.debug) {
                    console.log(`读取${url}内容获取base64！`);
                }
                let buffer = await readFile(url, true);
                fileBase64[url] = base64 = buffer.toString('base64');
            }
            this.text = this.text.replace(item, 'data:image/' + new URL(url).pathname.replace(/.*\.(\w+)$/, "$1") + ";base64," + base64);
        }

        let cssList = this.items.filter(item => /\.css/.test(item));
        for (let item of cssList) {
            let url = path.resolve(path.dirname(this.basePath), item);
            if (!await exists(url)) {
                continue;
            }
            const text = await readFile(url);
            await new TextHelper(url, text).base64();
        }

        await writeFile(this.basePath, this.text);
        return this.text;
    }


    findUrlList() {
        const URL_REGX = /(url\(('|"|)|(src|href)=['"])(.*?)['")]/ig;
        let exec = URL_REGX.exec(this.text);
        let result = [];
        if (!exec) {
            return result;
        }
        while (exec) {
            let url = exec[4];
            if (!/^http|\/\/|data:/.test(url)) {
                result.push(url);
            }
            exec = URL_REGX.exec(this.text);
        }
        return result;


    }


}

module.exports = TextHelper;