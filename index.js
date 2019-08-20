const fs = require('fs');
const path = require('path');
const {findFile, readFile, createDir, writeFile, copy, del} = require('./fileHelper');
const HtmlHelper = require('./htmlHelper');
const TextHelper = require('./textHelper');
const config = require(process.cwd() + '/page-one-stop.config');


async function handle(files) {
    files = files.filter(file => !config.skip || !config.skip.test(file));
    for (let file of files) {
        let text = await readFile(file);
        const htmlPath = file.replace(config.src, path.resolve(__dirname, config.output));
        let help = new HtmlHelper(text, file, htmlPath);
        await help.includeTemplate();
        await help.uglifyJavaScript();
        await help.minifyCss();
        const html = help.toString();
        await createDir(htmlPath);
        await writeFile(htmlPath, html);
        let textHelper = new TextHelper(htmlPath, html, true);
        if (config.base64) {
            await textHelper.base64();
        }
        if (config.md5) {
            await textHelper.md5();
        }
    }
}

//调用文件遍历方法
del(config.output)
    .then(() => {
        return copy(config.src, config.output, (target, dest) => {
            return !config.exclude.test(target);
        })
    })
    .then(() => {
        return findFile(config.output, config.include, config.exclude);
    }).then(files => {
    return handle(files);
});










