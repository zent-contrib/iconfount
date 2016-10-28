# fount

`fount`是一个icon font生成工具，支持从多个的svg文件生成一套字体以及对应的样式文件。

## Install

`ynpm install -g @youzan/fount` or `yarn global add @youzan/fount`.

## Usage

```text
Usage: fount --config file [options]

Options:
  --help        print this message and exit  [boolean]
  -c, --config  config file to read  [required]
  -t, --test    test configuration and exit  [boolean]
```

## Config file

支持`json`或者`js`文件，`js`文件的话直接`export`一个包含配置信息的对象。

`sample/`目录下有一个示例配置文件，仅供参考。

`doc/`目录下有一些文档，对详细理解一些配置有帮助。

### Parameters

#### name

type: `string`

required: `false` 

default: `'fount'`

字体名字，最好英文吧

#### output

type: `string`

required: `true`

输出字体、样式以及示例文件的目录，可以是相对路径或者绝对路径

#### hinting

type: `boolean`

required: `false`

default: `false`

是否使用`ttfautohint`对字体文件做hint，需要安装`ttfautohint`，`brew install ttfautohint`。
建议开启。

#### units_per_em

type: `number`

required: `false`

default: `1000`

简单理解为单个svg图标的画板大小，[detail](https://www.w3.org/TR/SVG/fonts.html#FontFaceElementUnitsPerEmAttribute)
不清楚的话不要设置。

#### ascent

type: `number`

required: `false`

default: `850`

从baseline到最高字符顶部的高度, [detail](https://www.w3.org/TR/SVG/fonts.html#FontFaceElementAscentAttribute)
不清楚的话不要设置。

#### weight

type: `number`

required: `false`

default: `400`

字体的粗细，和`font-weight`属性一致

#### start_codepoint

type: `number`

required: `false`

default: `59392`, 即`0xE800`。

最小`0xE000`(`57344`)，最大`0xF8FF`(`63743`)，这个区间是
Unicode的[Private Use Area](https://en.wikipedia.org/wiki/Private_Use_Areas#Private_Use_Areas)，
虽然planes 15 and 16也是Private Use Areas，但是我们不支持这两个区间。

#### glyphs_dir

type: `string`

required: `true`

存放svg文件的根目录，可以是相对目录或者绝对目录。

#### glyphs

type: `Array.<Glyph>`

required: `true`

所有图标的定义，每个图标有如下几个属性.

##### glyphs.keywords

type: `Array.<string>`

required: `false`

default: `[]`

图标的一些tag，主要是描述图标的作用.

##### glyphs.src

type: `string`

required: `true`

图标相对`glyphs_dir`的路径。

##### glyphs.css

type: `string`

required: `true`

图标的CSS名字，图标最终的class是`${meta.css_prefix_text}${css}`，如果`meta.css_use_suffix`
是`true`，图标最终的class是`${css}${meta.css_prefix_text}`。


##### glyphs.correct_contour_direction

type: `boolean`

required: `false`

default: `false`

是否使用`fontforge`对字符做轮廓方向修正，需要安装`fontforge`，安装具体参见`doc/fontforge.md`。
视情况开启，如果生成的字符填充位置不正常，再考虑开启。不过做好是让设计修改原图的路径方向，具体请看
`doc/contour-direction.md`

#### meta

type: `Object`

required: `false`

一些元数据

##### meta.author

type: `string`

required: `false`

default: `''`

字体的作者

##### meta.license

type: `string`

required: `false`

default: `''`

字体的许可协议

##### meta.license_url

type: `string`

required: `false`

default: `''`

字体许可协议链接

##### meta.homepage

type: `string`

required: `false`

default: `''`

字体主页

##### meta.css_prefix_text

type: `boolean`

required: `false`

default: `'icon-'`

图标css前缀。

#### meta.css_use_suffix

type: `boolean`

required: `false`

default: `false`

如果为`true`, `meta.css_prefix_text`将被用作css后缀。

##### meta.columns

type: `number`

required: `false`

default: `4`

示例页面中每行的列数。

##### meta.filename_hash

type: `boolean`

required: `false`

default: `true`

是否在文件名中加入随机字符串，确保每次生成的文件名都不同。
