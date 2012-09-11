var BufferedStream = require('morestreams').BufferedStream;
var pkgcloud = require('pkgcloud');
exports.attach = function () {
   var app = this;
   var client = pkgcloud.storage.createClient({
      provider: 'rackspace',
      auth: app.config.get('rackspace:cloudfiles:auth')
   });
   app.before('build.output', function (err, description, stream, callback) {
      if (!description.filename) {
         callback.apply(this, arguments);
         return;
      }
      var uploadStream = client.upload({
         remote: description.filename,
         container: app.config.get('rackspace:snapshotsContainer')
      });
      uploadStream.on('error', callback);
      uploadStream.on('end', function () {
         callback(null);
      });
      stream.pipe(uploadStream);
   });
}