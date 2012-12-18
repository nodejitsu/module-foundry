var fs = require('fs'),
    path = require('path'),
    BufferedStream = require('morestreams').BufferedStream;

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

