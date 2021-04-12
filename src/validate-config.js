'use strict';

var Ajv = require('ajv');
var path = require('path');

var schema = require('./config-schema');

var ajv = new Ajv({allErrors: true});
var validate = ajv.compile(schema);

module.exports = function testConfig(configFile) {
  var data = require(path.resolve(configFile));
  var valid = validate(data);
  if (!valid) {
    return ajv.errorsText(validate.errors);
  }
}
