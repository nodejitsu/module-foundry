var BufferedStream = require('morestreams').BufferedStream;
var fs = require('fs');
var path = require('path');

exports.attach = function () {
   var app = this;
   var basePath = app.config.get('localfiles:path');

   app.before('build.output', function (err, description, stream, callback) {
      if (!description.filename) {
         callback.apply(this, arguments);
         return;
      }

      var us = stream.pipe(fs.createWriteStream(path.join(basePath, description.filename)));

      us.on('error', callback);
      us.on('end', callback);

   });
}

