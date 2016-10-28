# Web常用字体类型

## ttf
即TrueType font，80年代由Apple和微软开发，macOS和Windows都原生支持这个格式。绝大多数浏览器都支持这个格式。

## woff/woff2
这是Web Open Font Format的缩写，这个格式是专门为Web开发的，比较新，2009才开始开发，现在是W3C
的一个标准。WOFF本质上是OpenType或者TrueType的一层封装，主要多了压缩这个特点，适合网络传输。
绝大多数浏览器都支持这个格式。

## eot
Embedded OpenType，微软十几年前搞出来的，只有IE支持，和WOFF是竞争关系。

## SVG font
Scalable Vector Graphics font, 缺点是大，不支持hinting，只有老的Safari和Chrome支持，可以认为
已经被WOFF替代。

## 各个格式的兼容性

|       | Chrome | Firefox | Opera | Safari | IE  |
|-------|--------|---------|-------|--------|-----|
| TTF   | 4      | 3.5     | 10    | 3.1    | 9   |
| WOFF  | 5      | 3.6     | 11.10 | 5.1    | 9   |
| WOFF2 | 36     | 39      | 23    | 10     | N/A |
| SVG   | 4-37   | N/A     | 9-24  | 3.2    | N/A |
| EOT   | N/A    | N/A     | N/A   | N/A    | 6   |
