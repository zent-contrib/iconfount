// json-schema for font config validation

'use strict';

module.exports = {
  type: 'object',
  additionalProperties: false,
  required: ['name', 'output', 'glyphs', 'glyphs_dir'],
  properties: {
    name: { type: 'string' },
    output: { type: 'string' },
    hinting: { type: 'boolean' },
    units_per_em: { type: 'integer', minimum: 10 },
    ascent: { type: 'integer', minimum: 10 },
    weight: { type: 'number', minimum: 100 },
    copyright: { type: 'string' },
    start_codepoint: { type: 'number', "maximum": 63743, "minimum": 57344 },
    glyphs_dir: { type: 'string' },
    glyphs: {
      type: 'array',
      minItems: 1,
      items: {
        css: { type: 'string' },
        src: { type: 'string' },
        keyword: { type: 'array',  minItems: 1, items: { type: 'string' } },
        correct_contour_direction: { type: 'boolean' },
        required: ['css', 'src']
      }
    },
    meta: {
      type: 'object',
      properties: {
        author: { type: 'string' },
        license: { type: 'string' },
        license_url: { type: 'string' },
        homepage: { type: 'string' },
        css_prefix_text: { type: 'string' },
        css_use_suffix: { type: 'boolean' },
        columns: { type: 'number' },
        filename_hash: { type: 'boolean' }
      }
    }
  }
};
