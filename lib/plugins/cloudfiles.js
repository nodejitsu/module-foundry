var BufferedStream = require('morestreams').BufferedStream,
    pkgcloud = require('pkgcloud');

exports.name = 'cloudfiles';

exports.attach = function () {
  var app = this,
      client;

  client = pkgcloud.storage.createClient({
    provider: 'rackspace',
    username: app.config.get('rackspace:cloudfiles:username'),
    apiKey: app.config.get('rackspace:cloudfiles:apiKey')
  });

  app.before('build.create', function (bot, next) {
    bot.before('build.output', function (err, description, stream, callback) {
      if (err || !description.filename) {
        return callback(err, description, stream);
      }

      client.auth(function (err) {
        if (err) {
          return callback(err, description, stream);
        }

        var uploadStream = client.upload({
          remote: description.filename,
          container: app.config.get('rackspace:snapshotsContainer')
        });

        uploadStream.on('error', function (err) {
          console.error('upload error!', err)
          callback(err, description, stream);
        });

        uploadStream.on('end', function () {
          console.error('upload ok!', description.filename)
          setTimeout(callback.bind(null, null, description, stream), 6 * 1000);
        });

        stream.pipe(uploadStream);
      });
    });

    next(bot);
  });
};
