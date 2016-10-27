#!/usr/bin/env python

import fontforge
import sys

def main():
    ttfInput = sys.argv[1]
    ttfOutput = sys.argv[2]
    font = fontforge.open(ttfInput)
    font.selection.all()
    font.correctDirection()
    font.generate(ttfOutput)
    font.close()

if __name__ == '__main__':
    main();
