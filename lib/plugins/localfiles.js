/*
 * localfiles.js: Pluging to write build output to local disk.
 *
 * (C) 2012 Nodejitsu Inc.
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

  app.before('build.output', function (err, description, stream, callback) {
    if (!description.filename) {
      return callback.apply(this, arguments);
    }

    var us = stream.pipe(fs.createWriteStream(path.join(basePath, description.filename)));

    us.on('error', callback);
    us.on('end', callback);
  });
};

