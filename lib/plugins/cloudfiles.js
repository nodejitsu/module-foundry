var BufferedStream = require('morestreams').BufferedStream;
var pkgcloud = require('pkgcloud');
exports.attach = function () {
   var app = this;
   var client = pkgcloud.storage.createClient({
      provider: 'rackspace',
      username: app.config.get('rackspace:cloudfiles:username'),
      apiKey: app.config.get('rackspace:cloudfiles:apiKey')
   });

   app.before('build.create', function (bot, next) {
     bot.before('build.output', function (err, description, stream, callback) {
       if (err || !description.filename) {
         callback(err, description, stream);
         return;
       }

       client.auth(function(err) {
         if (err) {
           callback(err, description, stream);
           return;
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
}
