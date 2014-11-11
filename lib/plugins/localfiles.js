/*
 * localfiles.js: Pluging to write build output to local disk.
 *
 * (C) 2012 Charlie Robbins, Bradley Meck, and the Contributors
 *
 */

var fs = require('fs'),
    path = require('path');

//
// Name this plugin
//
exports.name = 'localfiles';

//
// ### function attach ()
// Attaches this plugin to the application by adding
// a `before` handler to `build.output` and writing
// the stream to local disk.
//
exports.attach = function () {
  var app = this,
      basePath = app.config.get('localfiles:path');

  app.before('build.create', function (bot, next) {
    bot.before('build.output', function (description, stream, callback) {
      if (!description.filename) {
        return callback(new Error('Cannot save locally without explicit filename'));
      }

      stream.pipe(fs.createWriteStream(path.join(basePath, description.filename)))
        .on('error', callback)
        .on('end', callback);
    });

    next(null, bot);
  });
};

