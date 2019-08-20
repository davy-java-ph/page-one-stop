const fse = require('fs-extra');
const fs = require('fs');
const path = require('path');
/**
 * 文件夹下文件列表
 * @param dir
 * @returns {Promise<*>}
 */
const getFiles= async (dir) => {
    return new Promise(((resolve, reject) => {
        fs.readdir(dir, (err, data) => {
            err ? reject(err) : resolve(data);
        });
    }));
};
/**
 * 路径是否是文件
 * @param file 文件路径
 * @returns {Promise<*>}
 */
const isFile= async (file) => {
        return new Promise(((resolve, reject) => {
            fs.stat(file, function (error, stats) {
                error ? reject(error) : resolve(stats.isFile());
            });
        }));
    };

/**
 * 获取文件大小
 * @param file
 * @returns {Promise<void>}
 */
const fileSize = async (file) => {
   return  new Promise(((resolve, reject) => {
        fs.stat(file, function (err, stats) {
            err ? reject(err) : resolve(stats.size);
        })
    }));
};
/**
 * 遍历找到想要的文件
 * @param src  根目录
 * @param include 文件检查正则
 * @param exclude  排除目录正则
 * @returns {Promise<Array>}
 */
const findFile= async (src, include, exclude) => {
    let list = [];
    let files = await getFiles(path.resolve(src));
    files = files.map(file => path.join(src, file))
        .filter(file => !exclude || !exclude.test(file));
    for (let file of files) {
        if (!await isFile(file)) {
            list = list.concat(await findFile(file, include, exclude));
        } else if (!include || include.test(file)) {
            list.push(file);
        }
    }
    return list;
};


const readFile = async (file,buffer=false) => {
    return new Promise((resolve, reject) => {
        fs.readFile(file, (err, data) => {
            err ? reject(err) : resolve(buffer? Buffer.from(data):data.toString('utf8'));
        })
    });
};

const createDir = async (dir) => {
     dir = path.dirname(path.normalize(dir));
    return new Promise((resolve, reject) => {
        fs.mkdir(dir, {recursive: true}, err => {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });
};

const writeFile = async (file, text) => {
    return new Promise((resolve, reject) => {
        fs.writeFile(file, text, err => {
            err ? reject(err) : resolve(true);
        });
    });
};

const exists = async (file) => {
    return new Promise(((resolve, reject) => {
        fs.access(file, fs.constants.F_OK, err => {
            resolve(!!!err);
        });
    }));

};

const copy = async (target,dest,filter) => {
    return fse.copy(target, dest, {filter: filter});
};

const del = async (target) => {
    return fse.remove(target);
};
module.exports = {

    getFiles,
    isFile,
    findFile,
    readFile,
    createDir,
    writeFile,
    exists,
    copy,
    fileSize,
    del




};