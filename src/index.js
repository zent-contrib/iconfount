"use strict";

var _ = require('lodash');
var svgpath = require('svgpath');
var path = require('path');
var fs = require('fs');
var rimraf = require('rimraf');
var mkdirp = require('mkdirp');
var svg2ttf = require('svg2ttf');
var ttf2eot = require('ttf2eot');
var ttf2woff = require('ttf2woff');
var ttf2woff2 = require('ttf2woff2');
var child_process = require('child_process');
var jade = require('jade');
var b64 = require('base64-js');

var loadSvg = require('./svg');
var log = require('./log');

var TEMPLATES_DIR = path.join(__dirname, '../templates');
var SVG_FONT_TEMPLATE = _.template(fs.readFileSync(path.join(TEMPLATES_DIR, 'font/svg.tpl'), 'utf8'));
var TEMPLATES = _.reduce({
  'demo.jade':              'demo.html',
  'css/css.jade':           'css/${FONTNAME}.css',
  'css/css-ie7.jade':       'css/${FONTNAME}-ie7.css',
  'css/css-codes.jade':     'css/${FONTNAME}-codes.css',
  'css/css-ie7-codes.jade': 'css/${FONTNAME}-ie7-codes.css',
  'css/css-embedded.jade':  'css/${FONTNAME}-embedded.css',
  'LICENSE.jade':           'LICENSE.txt',
  'css/animation.css':      'css/animation.css',
  'README.txt':             'README.txt'
}, function (templates, outputName, inputName) {
  var inputFile = path.join(TEMPLATES_DIR, inputName);
  var inputData = fs.readFileSync(inputFile, 'utf8');
  var outputData;

  switch (path.extname(inputName)) {
    case '.jade': // Jade template.
      outputData = jade.compile(inputData, {
        pretty: true,
        filename: inputFile
      });
      break;

    case '.tpl': // Lodash template.
      outputData = _.template(inputData);
      break;

    default: // Static file - just do a copy.
      outputData = _.constant(inputData);
      break;
  }

  templates[outputName] = outputData;
  return templates;
}, {});

function collectGlyphsInfo(config) {
  var scale = config.units_per_em / 1000;
  var result = _.map(config.glyphs, function (glyph) {
    var sp = svgpath(glyph.svg.path)
              .scale(scale, -scale)
              .translate(0, config.ascent)
              .abs().round(0).rel();

    return {
      src: glyph.src,
      // uid:      glyph.uid,
      code: glyph.code,
      css: glyph.css,
      width: +(glyph.svg.width * scale).toFixed(1),
      d: sp.toString(),
      segments: sp.segments.length
    };
  });

  // Sort result by original codes.
  result.sort((a, b) => a.code - b.code);

  return result;
}

function fontConfig(config) {
  config.hinting = !!config.hinting;
  config.correct_contour_direction = !!config.correct_contour_direction;
  config.units_per_em = +config.units_per_em || 1000;
  config.ascent = +config.ascent || 850;
  config.weight = config.weight || 400;
  config.copyright = config.copyright || 'Copyright (C) ' + new Date().getFullYear() + ' by original authors';

  var fontname;
  if (!_.isEmpty(config.name)) {
    fontname = String(config.name).replace(/[^a-z0-9\-_]+/g, '-');
  } else {
    fontname = 'font';
  }

  var glyphsInfo = collectGlyphsInfo(config);
  if (_.isEmpty(glyphsInfo)) return null;

  var meta = config.meta || {};
  return {
    font: {
      fontname,
      fullname: fontname,
      // !!! IMPORTANT for IE6-8 !!!
      // due bug, EOT requires `familyname` begins `fullname`
      // https://github.com/fontello/fontello/issues/73?source=cc#issuecomment-7791793
      familyname: fontname,
      copyright: config.copyright,
      ascent: config.ascent,
      descent: config.ascent - config.units_per_em,
      weight: config.weight
    },
    output: path.resolve(config.output),
    hinting: config.hinting,
    correct_contour_direction: config.correct_contour_direction,
    meta: _.extend({}, meta, {
      // Used by the demo page
      columns: meta.columns || 4,
      css_prefix_text: meta.css_prefix_text || 'icon-',
      css_use_suffix: Boolean(meta.css_use_suffix),

      // append hash to font file name
      filename_hash: Boolean(meta.filename_hash) ? '-' + Math.floor(Math.random() * 100000000) : ''
    }),
    glyphs: glyphsInfo
  };
};

function generateFonts(buildConfig) {
  var timeStart = Date.now();
  var fontname = buildConfig.font.fontname;
  var files;

  log.info('Start generation:');

  // Collect file paths.
  var fileNameHash = buildConfig.meta.filename_hash;
  var fontNameWithHash = fontname + fileNameHash;
  files = {
    config:      path.join(buildConfig.output, 'config.json'),
    svg:         path.join(buildConfig.output, 'font', fontNameWithHash + '.svg'),
    ttf:         path.join(buildConfig.output, 'font', fontNameWithHash + '.ttf'),
    ttfUnhinted: path.join(buildConfig.output, 'font', fontNameWithHash + '-unhinted.ttf'),
    ttfDirectionNotCorrected: path.join(buildConfig.output, 'font', fontNameWithHash + '-direction-not-corrected.ttf'),
    eot:         path.join(buildConfig.output, 'font', fontNameWithHash + '.eot'),
    woff:        path.join(buildConfig.output, 'font', fontNameWithHash + '.woff'),
    woff2:       path.join(buildConfig.output, 'font', fontNameWithHash + '.woff2')
  };

  // Prepare temporary working directory.
  rimraf.sync(buildConfig.output);
  mkdirp.sync(buildConfig.output);
  mkdirp.sync(path.join(buildConfig.output, 'font'));
  mkdirp.sync(path.join(buildConfig.output, 'css'));

  // Write client config
  var configOutput = JSON.stringify(buildConfig, null, '  ');
  fs.writeFileSync(files.config, configOutput, 'utf8');
  log.info('write build config');

  // Generate initial SVG font.
  var svgOutput = SVG_FONT_TEMPLATE(buildConfig);
  fs.writeFileSync(files.svg, svgOutput, 'utf8');
  log.info('write svg font');

  // Convert SVG to TTF
  var ttf = svg2ttf(svgOutput, { copyright: buildConfig.font.copyright });
  fs.writeFileSync(files.ttf, new Buffer(ttf.buffer));
  log.info('write ttf first-pass');

  // Autohint the resulting TTF.
  // Don't allow hinting if font has "strange" glyphs.
  // That's useless anyway, and can hang ttfautohint < 1.0
  var maxSegments = _.maxBy(buildConfig.glyphs, glyph => glyph.segments).segments;
  if (maxSegments <= 500 && buildConfig.hinting) {
    log.info('autohint with ttfautohint');

    fs.renameSync(files.ttf, files.ttfUnhinted);
    child_process.execFileSync('ttfautohint', [
      '--no-info',
      '--windows-compatibility',
      '--symbol',
      // temporary workaround for #464
      // https://github.com/fontello/fontello/issues/464#issuecomment-202244651
      '--fallback-script=latn',
      files.ttfUnhinted,
      files.ttf
    ], { cwd: process.cwd() });
    fs.unlinkSync(files.ttfUnhinted);
    log.info('write ttf autohint');
  }

  // 主要是处理有些fill-rule设置为evenodd的svg文件，因为ttf支持non-zero的模式，所以会导致
  // 生成的字体文件里有些路径被错误填充了
  // 这个功能依赖fontforge
  if (buildConfig.correct_contour_direction) {
    log.info('try correct contour direction with fontforge');

    fs.renameSync(files.ttf, files.ttfDirectionNotCorrected);
    child_process.execFileSync(path.resolve(__dirname, '../scripts/correct-direction.py'), [
      files.ttfDirectionNotCorrected,
      files.ttf
    ], { cwd: process.cwd() });
    fs.unlinkSync(files.ttfDirectionNotCorrected);
    log.info('write ttf correct direction');
  }

  // generate other font types
  var ttfOutput = new Uint8Array(fs.readFileSync(files.ttf));
  var eotOutput = ttf2eot(ttfOutput).buffer;
  fs.writeFileSync(files.eot, new Buffer(eotOutput));
  log.info('write eot file');

  var woffOutput = ttf2woff(ttfOutput).buffer;
  fs.writeFileSync(files.woff, new Buffer(woffOutput));
  log.info('write woff file');

  var woff2Output = ttf2woff2(ttfOutput).buffer;
  fs.writeFileSync(files.woff2, new Buffer(woff2Output));
  log.info('write woff2 file');

  // Write template files. (generate dynamic and copy static)
  _.forEach(TEMPLATES, function(templateData, templateName) {
    var outputName = templateName.replace('${FONTNAME}', fontname);
    var outputFile = path.join(buildConfig.output, outputName);
    var outputData = templateData(buildConfig);

    outputData = outputData
                    .replace('%WOFF64%', b64.fromByteArray(woffOutput))
                    .replace('%TTF64%', b64.fromByteArray(ttfOutput));

    fs.writeFileSync(outputFile, outputData, 'utf8');
  });
  log.info('write demo/css files');

  var timeEnd = Date.now();
  log.info('Generated in ' + (timeEnd - timeStart) / 1000)
}

module.exports = function build(configFile) {
  var config = require(path.resolve(configFile));
  config.start_codepoint = config.start_codepoint || 0xe800;

  var glyphsDir = config.glyphs_dir || process.cwd();
  var glyphs = config.glyphs.map(function(glyph) {
    var xml = fs.readFileSync(path.join(glyphsDir, glyph.src), 'utf-8');
    return loadSvg(xml, glyph, config.start_codepoint);
  });
  var buildConfig = fontConfig(_.extend({}, config, {
    glyphs: glyphs
  }));

  generateFonts(buildConfig);

  return buildConfig;
};
