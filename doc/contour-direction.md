# 关于SVG的`fill-rule`以及TTF的字符轮廓方向(glyph contour direction)

由于Sketch在设计界的流行，支持导入Sketch生成的SVG文件是`fount`的一个目标。但是Sketch导出的
SVG文件烂是公认的事实，由于TTF文件并不能100%支持SVG的特性，所以转换的时候有些东西其实是会被丢掉的。
我们要做的是尽可能保留SVG文件对字符形状的描述，至于颜色之类的根本不重要。

这个事情要从Sketch生成的SVG文件中的一个attribute说起, `fill-rule`。这个attribute在SVG中有
两个值（实际是三个，但是`inherit`对我们来说没有实际意义），`nonzero`(默认)和`evenodd`。最新
版本(40.x)的Sketch生成的SVG文件的`fill-rule`似乎永远都是`evenodd`，但是TTF的填充算法只支持
`nonzero`，这两种模式的效果在同一个图像中有时候是不一样的。

## SVG路径

SVG支持的基础图形包括，矩形(`<rect>`)、圆(`<circle>`)、椭圆(`<ellipse>`)以及多边形(`<polygon>`)
等等，这些基础图形又都可以归结到路径（`<path>`)来，它们只是一种‘语法糖’。

## `fill-rule`是干什么的？

简单来说，这个属性定义了使用什么算法来判断一个点在路径里面还是外面。对于不相交的路径一个点在里面还是
外面是很直观的，但是对于有重叠的复杂路径，就需要一些规则来确定点在里面还是外面，`full-rule`就是
定义这个算法的。

## `evenodd`

这个规则比较简单：从点往任意方向画一条射线，如果这条射线和路径的交点个数是偶数则认为点在路径外；
如果交点个数是奇数则认为点在路径内。

<svg width="12cm" height="4cm" viewBox="0 0 1200 400"  version="1.1"
     xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <desc>Example fillrule-evenodd - demonstrates fill-rule:evenodd</desc>

  <rect x="1" y="1" width="1198" height="398"
        fill="none" stroke="blue" />
  <defs>
    <path id="Triangle" d="M 16,0 L -8,9 v-18 z" fill="black" stroke="none" />
  </defs>
  <g fill-rule="evenodd" fill="red" stroke="black" stroke-width="3" >
    <path d="M 250,75 L 323,301 131,161 369,161 177,301 z" />
    <use xlink:href="#Triangle" transform="translate(306.21 249) rotate(72)" overflow="visible"  />
    <use xlink:href="#Triangle" transform="translate(175.16,193.2) rotate(216)" overflow="visible"  />
    <use xlink:href="#Triangle" transform="translate(314.26,161) rotate(0)" overflow="visible"  />
    <use xlink:href="#Triangle" transform="translate(221.16,268.8) rotate(144)" overflow="visible"  />
    <use xlink:href="#Triangle" transform="translate(233.21,126.98) rotate(288)" overflow="visible"  />
    <path d="M 600,81 A 107,107 0 0,1 600,295 A 107,107 0 0,1 600,81 z
             M 600,139 A 49,49 0 0,1 600,237 A 49,49 0 0,1 600,139 z" />
    <use xlink:href="#Triangle" transform="translate(600,188) rotate(0) translate(107,0) rotate(90)" overflow="visible"  />
    <use xlink:href="#Triangle" transform="translate(600,188) rotate(120) translate(107,0) rotate(90)" overflow="visible"  />
    <use xlink:href="#Triangle" transform="translate(600,188) rotate(240) translate(107,0) rotate(90)" overflow="visible"  />
    <use xlink:href="#Triangle" transform="translate(600,188) rotate(60) translate(49,0) rotate(90)" overflow="visible"  />
    <use xlink:href="#Triangle" transform="translate(600,188) rotate(180) translate(49,0) rotate(90)" overflow="visible"  />
    <use xlink:href="#Triangle" transform="translate(600,188) rotate(300) translate(49,0) rotate(90)" overflow="visible"  />
    <path d="M 950,81 A 107,107 0 0,1 950,295 A 107,107 0 0,1 950,81 z
             M 950,139 A 49,49 0 0,0 950,237 A 49,49 0 0,0 950,139 z" />
    <use xlink:href="#Triangle" transform="translate(950,188) rotate(0) translate(107,0) rotate(90)" overflow="visible"  />
    <use xlink:href="#Triangle" transform="translate(950,188) rotate(120) translate(107,0) rotate(90)" overflow="visible"  />
    <use xlink:href="#Triangle" transform="translate(950,188) rotate(240) translate(107,0) rotate(90)" overflow="visible"  />
    <use xlink:href="#Triangle" transform="translate(950,188) rotate(60) translate(49,0) rotate(-90)" overflow="visible"  />
    <use xlink:href="#Triangle" transform="translate(950,188) rotate(180) translate(49,0) rotate(-90)" overflow="visible"  />
    <use xlink:href="#Triangle" transform="translate(950,188) rotate(300) translate(49,0) rotate(-90)" overflow="visible"  />
  </g>
</svg>
