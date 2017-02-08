# iconfount和fontello的区别

iconfount的实现复用了很多[fontello](https://github.com/fontello/fontello)的代码和库。

svg预处理和demo文件模版都是来自fontello，做了很小的修改。

字体生成主要使用了fontello的子项目：`svg2ttf`，`ttf2eot`, `ttf2woff`以及`ttf2woff2`。

相比fontello的Browser-Server结构, iconfount是一个命令行工具。

iconfount包含了字符轮廓自动修正的功能，这个是fontello不支持的。

iconfount的配置文件并不兼容fontello。
