# page-one-stop
页面优化一条龙 模板插入，md5，base64，混淆压缩，合并

JS合并压缩 `data-group` 同组的将被合并到一个js文件内压缩

```html
<script data-group="a" src='./a.js'></script>
<script data-group="a" src='./b.js'></script>
```

标签上包含 `data-remove` 构建后将被删除

标签上包含 `data-include` 将被处理为插入 语法格式
```
{"src":"./include/header.html","position":"top"}  //position可选为 top,bootom,inside-top,inside-bootom
```

配置项
```javascript
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
```
