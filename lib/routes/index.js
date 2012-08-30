var BuildBot = require('../buildbot');
//
// Example server, should be fleshed out
//
var zlib = require('zlib');
var tmp = require('tmp');
var BufferedStream = require('morestreams').BufferedStream;
var semver = require('semver');
var bot = new BuildBot();
var os = require('os');
var merge = require('merge-recursive');

module.exports = function (app, options) {
   //
   // /build
   //
   app.routers.authorized.path('/build', function () {
      this.post(function () {
         var res = this.res;
         var req = this.req;
         var pkg = req.headers['x-package-json'];
         if (pkg) {
            try {
               pkg = JSON.parse(pkg);
            }
            catch (e) {
               res.writeHead(400);
               res.end(e.message);
               return;
            }
         }
         //
         // Start unzipping before waiting on tmp directory (still needs to be buffered for BuildBot)
         //
         var buff = new BufferedStream();
         req.buffered.pipe(zlib.createGunzip()).pipe(buff);
         tmp.dir(function (err, dir) {
           if (err) {
             res.writeHead(400);
             res.end(err.message);
             return;
           }
           var jobDescription = {
             platform: os.platform(),
             arch: os.arch(),
             version: semver.maxSatisfying(app.config.get('versions') || [process.version.slice(1)], req.params && req.params['version'] || app.config.get('defaults:version') || '*'),
             env: {
               npm_config_production: 'true'
             },
             user: app.config.get('user') || 'nobody',
             repository: { type: 'tar-stream', stream: buff, destination: dir }
           };
           jobDescription.env.npm_config_nodedir = process.env.HOME + '/.node-gyp' + '/' + jobDescription.version;
           if (pkg) {
            merge.recursive(jobDescription, pkg);
           }
           bot.build(jobDescription, function (err, tgz) {
             if (err) {
               res.writeHead(400);
               res.end(err.message);
               return;
             }
             res.writeHead(200, {
               'content-type': 'application/tar+gzip'
             });
             tgz.pipe(res);
           });
         });
      })
   });
};
