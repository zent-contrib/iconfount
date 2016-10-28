# fontforge Guide

自动修正字体轮廓方向需要安装fontforge。

## Install fontforge command line tools

`brew install fontforge`

> Follow the guide on the screen to install fontforge module to your python path.

## Enable ucs2 support in Python

If you see this error when importing fontforge in Python

```
 dlopen(/usr/local/lib/python2.7/site-packages/fontforge.so, 2): Symbol not found: _PyUnicodeUCS2_AsUTF8String
```

Do this:

```shell
pyenv uninstall 2.7.11
PYTHON_CONFIGURE_OPTS="--enable-unicode=ucs2" pyenv install 2.7.11
```
