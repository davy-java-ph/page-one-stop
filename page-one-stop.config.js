module.exports = {
    debug: true,
    src: 'C:\\Users\\davy\\IdeaProjects\\page-one-stop\\test',  //入口目录，程序尝试寻找目录下的html文件作为入口
    include: /\.html$/, //不填，默认即为html文件
    skip: /include/,
    exclude: /node_modules/,
    output: './dist', //输出路径
    md5: {
        test: /css|js|png|jpg|gif/
    },
    base64: {
        test: /png|jpg/,
        maxSize: 1024
    }
};