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

"use strict";

var _ = require("lodash");
var svgpath = require("svgpath");
var path = require("path");
var fs = require("fs");
var rimraf = require("rimraf");
var mkdirp = require("mkdirp");
var svg2ttf = require("svg2ttf");
var ttf2eot = require("ttf2eot");
var ttf2woff = require("ttf2woff");
var ttf2woff2 = require("ttf2woff2");
var child_process = require("child_process");
var pug = require("pug");
var b64 = require("base64-js");
var crypto = require("crypto");
var { optimize } = require("svgo");

var loadSvg = require("./svg");
var log = require("./log");

var ERROR = {
  ttfautohint: "ttfautohint not installed",
  fontforge: "fontforge python extension not installed",
};

var TEMPLATES_DIR = path.join(__dirname, "../templates");
var SVG_FONT_TEMPLATE = _.template(
  fs.readFileSync(path.join(TEMPLATES_DIR, "font/svg.tpl"), "utf8")
);
var TEMPLATES = _.reduce(
  {
    "demo.pug": "demo.html",
    "css/css.pug": "css/${FONTNAME}.css",
    "css/css-ie7.pug": "css/${FONTNAME}-ie7.css",
    "css/css-codes.pug": "css/${FONTNAME}-codes.css",
    "css/css-ie7-codes.pug": "css/${FONTNAME}-ie7-codes.css",
    "css/css-embedded.pug": "css/${FONTNAME}-embedded.css",
    "LICENSE.pug": "LICENSE.txt",
    "css/animation.css": "css/animation.css",
    "README.txt": "README.txt",
  },
  function (templates, outputName, inputName) {
    var inputFile = path.join(TEMPLATES_DIR, inputName);
    var inputData = fs.readFileSync(inputFile, "utf8");
    var outputData;

    switch (path.extname(inputName)) {
      case ".pug": // Pugjs template.
        outputData = pug.compile(inputData, {
          pretty: true,
          filename: inputFile,
        });
        break;

      case ".tpl": // Lodash template.
        outputData = _.template(inputData);
        break;

      default:
        // Static file - just do a copy.
        outputData = _.constant(inputData);
        break;
    }

    templates[outputName] = outputData;
    return templates;
  },
  {}
);

function getRandomString() {
  var hash = crypto.createHash("sha256");
  var randomNumber = Date.now() + _.random(0, 1, true) * 1000000;
  hash.update(randomNumber + "");
  return hash.digest("hex").slice(-10);
}

/**
 * 生成glyphs的json信息，可以给外部工具用来生成代码
 * @return {[type]} [description]
 */
function generateGlyphsJson(buildConfig) {
  var prefix = buildConfig.meta.css_prefix_text;
  var useSuffix = buildConfig.meta.css_use_suffix;
  var glyphs = buildConfig.glyphs;

  if (_.isEmpty(glyphs)) {
    return [];
  }

  return glyphs.map(function (g) {
    var css = useSuffix ? g.css + prefix : prefix + g.css;
    var hex = "0x" + g.code.toString(16);
    return {
      name: g.css,
      css: css,
      hexCodepoint: hex,
      codepoint: g.code,
      keywords: g.keywords,
    };
  });
}

function collectGlyphsInfo(config) {
  var scale = config.units_per_em / 1000;
  var badGlyphs = [];
  var result = _.map(config.glyphs, function (glyph) {
    var sp = svgpath(glyph.svg.path)
      .scale(scale, -scale)
      .translate(0, config.ascent)
      .abs()
      .round(0)
      .rel();

    // 把需要调整路径方向的字符保存起来，后面会交给fontforge处理
    if (glyph.correct_contour_direction) {
      badGlyphs.push(glyph.code);
    }

    return _.assign({}, _.pick(glyph, ["src", "code", "css", "keywords"]), {
      width: +(glyph.svg.width * scale).toFixed(1),
      d: sp.toString(),
      segments: sp.segments.length,
    });
  });

  // Sort result by original codes.
  result.sort((a, b) => a.code - b.code);

  return {
    glyphs: result,
    badGlyphs: badGlyphs,
  };
}

function fontConfig(config) {
  config.hinting = !!config.hinting;
  config.correct_contour_direction = !!config.correct_contour_direction;
  config.units_per_em = +config.units_per_em || 1000;
  config.ascent = +config.ascent || 850;
  config.weight = config.weight || 400;
  config.copyright =
    config.copyright ||
    "Copyright (C) " + new Date().getFullYear() + " by original authors";

  var fontname;
  if (!_.isEmpty(config.name)) {
    fontname = String(config.name).replace(/[^a-z0-9\-_]+/g, "-");
  } else {
    fontname = "iconfount";
  }

  var glyphsInfo = collectGlyphsInfo(config);
  if (_.isEmpty(glyphsInfo.glyphs)) return null;

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
      weight: config.weight,
    },
    output: path.resolve(config.output),
    hinting: config.hinting,
    meta: _.extend({}, meta, {
      // Used by the demo page
      columns: meta.columns || 4,
      css_prefix_text: meta.css_prefix_text || "icon-",
      css_use_suffix: Boolean(meta.css_use_suffix),

      // append hash to font file name
      filename_hash: Boolean(meta.filename_hash) ? "-" + getRandomString() : "",
    }),
    glyphs: glyphsInfo.glyphs,
    badGlyphs: glyphsInfo.badGlyphs,
  };
}

function generateFonts(buildConfig) {
  var timeStart = Date.now();
  var fontname = buildConfig.font.fontname;
  var files;

  log.info("Start generation:");

  // Collect file paths.
  var fileNameHash = buildConfig.meta.filename_hash;
  var fontNameWithHash = fontname + fileNameHash;
  files = {
    codes: path.join(buildConfig.output, "codes.json"),
    config: path.join(buildConfig.output, "config.json"),
    svg: path.join(buildConfig.output, "font", fontNameWithHash + ".svg"),
    ttf: path.join(buildConfig.output, "font", fontNameWithHash + ".ttf"),
    ttfUnhinted: path.join(
      buildConfig.output,
      "font",
      fontNameWithHash + "-unhinted.ttf"
    ),
    ttfDirectionNotCorrected: path.join(
      buildConfig.output,
      "font",
      fontNameWithHash + "-direction-not-corrected.ttf"
    ),
    eot: path.join(buildConfig.output, "font", fontNameWithHash + ".eot"),
    woff: path.join(buildConfig.output, "font", fontNameWithHash + ".woff"),
    woff2: path.join(buildConfig.output, "font", fontNameWithHash + ".woff2"),
  };

  // Prepare temporary working directory.
  rimraf.sync(buildConfig.output);
  mkdirp.sync(buildConfig.output);
  mkdirp.sync(path.join(buildConfig.output, "font"));
  mkdirp.sync(path.join(buildConfig.output, "css"));

  // Write client config
  var configOutput = JSON.stringify(buildConfig, null, 2);
  fs.writeFileSync(files.config, configOutput, "utf8");
  log.info("write build config");

  // Write codes
  var codesJSON = JSON.stringify(generateGlyphsJson(buildConfig), null, 2);
  fs.writeFileSync(files.codes, codesJSON, "utf8");
  log.info("write codes");

  // Generate initial SVG font.
  var svgOutput = SVG_FONT_TEMPLATE(buildConfig);
  fs.writeFileSync(files.svg, svgOutput, "utf8");
  log.info("write svg font");

  // Convert SVG to TTF
  var ttf = svg2ttf(svgOutput, { copyright: buildConfig.font.copyright });
  fs.writeFileSync(files.ttf, Buffer.from(ttf.buffer));
  log.info("write ttf first-pass");

  // Autohint the resulting TTF.
  // Don't allow hinting if font has "strange" glyphs.
  // That's useless anyway, and can hang ttfautohint < 1.0
  var maxSegments = _.maxBy(buildConfig.glyphs, (glyph) => glyph.segments)
    .segments;
  if (maxSegments <= 500 && buildConfig.hinting) {
    // 貌似未处理的异常被吃掉了，所以先判断命令是否存在
    var ttfautohintInstalled = false;
    try {
      child_process.execFileSync("ttfautohint", ["--version"], {
        cwd: process.cwd(),
      });
      ttfautohintInstalled = true;
    } catch (ex) {}

    if (!ttfautohintInstalled) {
      log.error(ERROR.ttfautohint);
      process.exit(-2);
    }

    log.info("autohint with ttfautohint");

    fs.renameSync(files.ttf, files.ttfUnhinted);
    child_process.execFileSync(
      "ttfautohint",
      [
        "--no-info",
        "--windows-compatibility",
        "--symbol",
        // temporary workaround for #464
        // https://github.com/fontello/fontello/issues/464#issuecomment-202244651
        "--fallback-script=latn",
        files.ttfUnhinted,
        files.ttf,
      ],
      { cwd: process.cwd() }
    );

    fs.unlinkSync(files.ttfUnhinted);
    log.info("write ttf autohint");
  }

  // 主要是处理有些fill-rule设置为evenodd的svg文件，因为ttf支持non-zero的模式，所以会导致
  // 生成的字体文件里有些路径被错误填充了
  // 这个功能依赖fontforge
  if (!_.isEmpty(buildConfig.badGlyphs)) {
    // 貌似未处理的异常被吃掉了，所以先判断命令是否存在
    var fontforgeInstalled = false;
    try {
      child_process.execFileSync(
        path.resolve(__dirname, "../scripts/test-fontforge.py"),
        [],
        { cwd: process.cwd() }
      );
      fontforgeInstalled = true;
    } catch (ex) {}

    if (!fontforgeInstalled) {
      log.error(ERROR.fontforge);
      process.exit(-1);
    }

    log.info("try correct contour direction with fontforge");

    fs.renameSync(files.ttf, files.ttfDirectionNotCorrected);
    child_process.execFileSync(
      path.resolve(__dirname, "../scripts/correct-direction.py"),
      [files.ttfDirectionNotCorrected, files.ttf].concat(buildConfig.badGlyphs),
      { cwd: process.cwd() }
    );
    fs.unlinkSync(files.ttfDirectionNotCorrected);
    log.info("write ttf correct direction");
  }

  // generate other font types
  var ttfOutput = new Uint8Array(fs.readFileSync(files.ttf));
  var eotOutput = ttf2eot(ttfOutput);
  fs.writeFileSync(files.eot, Buffer.from(eotOutput));
  log.info("write eot file");

  var woffOutput = ttf2woff(ttfOutput);
  fs.writeFileSync(files.woff, Buffer.from(woffOutput));
  log.info("write woff file");

  var woff2Output = ttf2woff2(ttfOutput).buffer;
  fs.writeFileSync(files.woff2, Buffer.from(woff2Output));
  log.info("write woff2 file");

  // Write template files. (generate dynamic and copy static)
  _.forEach(TEMPLATES, function (templateData, templateName) {
    var outputName = templateName.replace("${FONTNAME}", fontname);
    var outputFile = path.join(buildConfig.output, outputName);
    var outputData = templateData(buildConfig);

    outputData = outputData
      .replace("%WOFF64%", b64.fromByteArray(woffOutput))
      .replace("%TTF64%", b64.fromByteArray(ttfOutput));

    fs.writeFileSync(outputFile, outputData, "utf8");
  });
  log.info("write demo/css files");

  var timeEnd = Date.now();
  log.info("Generated in " + (timeEnd - timeStart) / 1000);
}

module.exports = function build(configFile) {
  var configFilePath = path.resolve(configFile);
  var config = require(configFilePath);
  config.start_codepoint = config.start_codepoint || 0xe800;

  // glyphs dir is relative to config file
  var glyphsDir = config.glyphs_dir || process.cwd();
  if (!path.isAbsolute(glyphsDir)) {
    glyphsDir = path.join(path.dirname(configFilePath), glyphsDir);
  }

  // output dir is relative to config file
  var outputDir = config.output;
  if (!path.isAbsolute(outputDir)) {
    outputDir = path.join(path.dirname(configFilePath), outputDir);
  }
  config.output = outputDir;

  var glyphs = config.glyphs.map(function (glyph) {
    var xml = fs.readFileSync(path.join(glyphsDir, glyph.src), "utf-8");

    const cleanXml = optimize(xml, {
      plugins: [{
        name: 'preset-default',
        params: {
          // 有些软件生成的 SVG 文件虽然本身写的不太对，但是浏览器里渲染是正常的，转换后会导致各种问题
          // https://github.com/svg/svgo/issues?q=convertPathData
          convertPathData: false
        }
      }]

    });

    if (cleanXml.error) {
      log.error(cleanXml.error);
      process.exit(1);
    }

    return loadSvg(cleanXml.data, glyph, config.start_codepoint);
  });

  var buildConfig = fontConfig(
    _.extend({}, config, {
      glyphs: glyphs,
    })
  );

  generateFonts(buildConfig);

  return buildConfig;
};
