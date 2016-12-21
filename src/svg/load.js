/**
 * Modified from fontello project: https://github.com/fontello/fontello
 *
 * (The MIT License)
 *
 * Copyright (C) 2011 by Vitaly Puzrin
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
*/

"use strict"

var _ = require('lodash');
var SvgPath = require('svgpath');

var log = require('../log');
var optimizeSvg = require('./optimize');

var maxAllocatedCodePoint = -1;

/**
 * Load svg image
 * @param  {String} data svg text content
 * @param  {Object} glyph glyph metadata
 */
module.exports = function loadSvgImage(data, glyph, defaultCodePoint) {
  var allocatedCode = maxAllocatedCodePoint === -1 ? defaultCodePoint : maxAllocatedCodePoint + 1;
  maxAllocatedCodePoint = allocatedCode;

  var result = optimizeSvg(data);
  if (result.error) {
    log.error(result.error);
    return;
  }

  // Collect ignored tags and attrs
  // We need to have array with unique values because
  // some tags and attrs have same names (viewBox, style, glyphRef, title).
  var skipped = _.union(result.ignoredTags, result.ignoredAttrs);

  if (skipped.length > 0) {
    log.warn(glyph.src, {skipped: skipped.toString()});
  } else if (!result.guaranteed) {
    log.warn(glyph.src, 'if image doesn\'t look as expected please convert to compound path manually');
  }

  // Scale to standard grid
  var scale  = 1000 / result.height;
  var d = new SvgPath(result.d)
            .translate(-result.x, -result.y)
            .scale(scale)
            .abs()
            .round(1)
            .toString();
  var width = Math.round(result.width * scale); // new width

  return _.assign({}, glyph, {
    code: allocatedCode,
    svg: {
      path: d,
      width
    }
  });
}
