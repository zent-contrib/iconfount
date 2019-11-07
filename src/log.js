'use strict';

var winston = require('winston');

var logger = winston.createLogger({
  transports: [
    new winston.transports.File({
      name: 'filelog',
      filename: 'iconfount.log',
      level: 'verbose',
    }),
    new winston.transports.Console({
      level: 'warn',
    }),
  ],
});

module.exports = logger;
