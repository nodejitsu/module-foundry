/*
 * pkgcloud.js: Plugin for uploading to Cloudfiles.
 *
 * (C) 2012 Nodejitsu Inc.
 *
 */

var pkgcloud = require('pkgcloud');

//
// Name this plugin
//
exports.name = 'pkgcloud';

//
// ### function attach ()
// Attaches this plugin to the application by adding
// a `before` handler to `build.output` and uploading
// the stream to Cloudfiles.
//
exports.attach = function () {
  var app = this,
      client;

  client = pkgcloud.storage.createClient(
    app.config.get('pkgcloud')
  );

  app.before('build.create', function (bot, next) {
    bot.before('build.output', function (description, stream, callback) {
      if (!description.filename) {
        return callback(description, stream);
      }

      client.auth(function (err) {
        if (err) {
          return callback(err, description, stream);
        }

        var uploadStream = client.upload({
          remote: description.filename,
          container: app.config.get('pkgcloud:container')
        });

        uploadStream.on('error', function (err) {
          console.error('upload error!', err);
          callback(err, description, stream);
        });

        uploadStream.on('end', function () {
          console.error('upload ok!', description.filename);
          setTimeout(callback.bind(null, null, description, stream), 6 * 1000);
        });

        stream.pipe(uploadStream);
      });
    });

    next(null, bot);
  });
};
