#!/usr/bin/env python

import fontforge
import sys

def main():
    argv = sys.argv;
    if len(argv) < 4:
        return;

    ttfInput = argv[1]
    ttfOutput = argv[2]
    badGlyphs = argv[3:]

    font = fontforge.open(ttfInput)
    for codepoint in badGlyphs:
        font.selection.select(('more', 'unicode'), int(codepoint))
    font.correctDirection()
    font.generate(ttfOutput)
    font.close()

if __name__ == '__main__':
    main();
