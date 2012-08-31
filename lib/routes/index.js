var BuildBot = require('../buildbot');
//
// Example server, should be fleshed out
//
var zlib = require('zlib');
var tmp = require('tmp');
var BufferedStream = require('morestreams').BufferedStream;
var semver = require('semver');
var bot = new BuildBot();
var merge = require('merge-recursive');
var fs = require('fs');

bot.before('npm.configure', function (err, spawnOptions, next) {
   if (err) {
      next(err, null);
      return;
   }
   var moduledir = spawnOptions.spawnWith.cwd;
   fs.readFile(moduledir + '/package.json', function (err, body) {
      if (err) {
         next(err, null);
         return;
      }
      var pkg = JSON.parse(body + '');
      merge(spawnOptions.env, pkg.env || {});
      next(null, spawnOptions);
   });
})

module.exports = function (app, options) {
   //
   // /build
   //
   app.routers.authorized.post('/build', function () {
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
      var buff = req.buffered.pipe(zlib.createGunzip()).pipe(new BufferedStream);
      tmp.dir(function (err, dir) {
        if (err) {
          res.writeHead(400);
          res.end(err.message);
          return;
        }
        var supportedVersions = app.config.get('node:versions');
        if (!Array.isArray(supportedVersions)) {
          supportedVersions = [supportedVersions];
          app.config.set('node:versions', supportedVersions);
        }
        var requestedVersion = semver.maxSatisfying(
            supportedVersions, req.params['version'] ? req.params['version'] : app.config.get('defaults:version')
        );
        if (!requestedVersion) {
          res.writeHead(400);
          res.end("No matching node version found");
        }
        var jobDescription = merge.recursive({}, app.config.get('defaults'), {
          //
          // Gyp is kinda picky about where it finds node installs
          //
          env: {
            npm_config_nodedir: app.config.get('node:gypdir') + '/' + requestedVersion
          },
          version: requestedVersion
        });
        //
        // Stream copy is not sufficient
        //
        jobDescription.repository = { type: 'tar-stream', stream: buff, destination: dir };
        if (pkg) {
          merge.recursive(jobDescription, pkg);
        }
        merge.recursive(jobDescription, app.config.get('spawning'));
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
   });
};
