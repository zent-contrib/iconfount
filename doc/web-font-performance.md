# Web font的性能问题

和普通的资源文件一样，字体文件也有加载时间，那么浏览器在加载资源的这段时间如何展示使用了这些字体的
内容呢？常见的问题大概有两种，相信大家细心的话应该都见过：

* FOIC(Flash Of Invisible Content)，网站打开的时候先是空白的，字体加载完了页面再重绘。

![foic](img/foic.gif)

* FOUC(Flash Of Unstyled Content)，网站打开的时候浏览器使用fallback字体渲染，待字体文件
加载完成后再重绘页面。

![fouc](img/fouc.gif)

大部分浏览器为了保证页面最终的可用性，都会在加载Web font时设置一个超时，在这段超时时间内，页面一般
都是被渲染成空白的（不过要小心链接的下划线，和list的样式，会出现很丑的页面）；如果超时了浏览器一般
会用一个fallback字体渲染页面，之后如果字体文件成功下载就会重绘页面并使用web font渲染。

`font-display`可以设置Web font加载的行为，但是浏览器支持还不好。

`font-display: auto | block | swap | fallback | optional`

## Reference
* [Controlling Font Performance with font-display](https://developers.google.com/web/updates/2016/02/font-display)
* [Web fonts, boy, I don't know](http://meowni.ca/posts/web-fonts/)
