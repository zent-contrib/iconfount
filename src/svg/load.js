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
