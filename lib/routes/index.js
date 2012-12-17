//
// Example server, should be fleshed out
//
var fs = require('fs'),
    zlib = require('zlib'),
    BufferedStream = require('morestreams').BufferedStream,
    merge = require('merge-recursive'),
    tmp = require('tmp'),
    semver = require('semver'),
    BuildBot = require('../buildbot');

module.exports = function (app, options) {
  //
  // Add "env" vars from package.json in module
  //
  app.before('build.create', function (bot, next) {
    bot.before('npm.configure', function (err, spawnOptions, next) {
      if (err) {
        return next(err, null);
      }

      var moduledir = spawnOptions.spawnWith.cwd;
      fs.readFile(moduledir + '/package.json', function (err, body) {
        if (err) {
          return next(err, null);
        }
        var pkg = JSON.parse(body + '');
        merge(spawnOptions.env, pkg.env || {});
        next(null, spawnOptions);
      });
    });

    next(bot);
  });

  //
  // /build
  //
  app.routers.authorized.post('/build', function () {
    var res = this.res,
        req = this.req,
        heartbeatTimer = setInterval(req.connection.write.bind(req.connection, ''), 60 * 1000),
        pkg = req.headers['x-package-json'];

    req.connection.setTimeout(20 * 60 * 1000);
    req.connection.on('close', function () {
      console.log('REMOVING TIMER');
      clearInterval(heartbeatTimer);
    });

    if (pkg) {
      try {
        pkg = JSON.parse(pkg);
      }
      catch (e) {
        res.writeHead(400);
        return res.end(e.message);
      }
    }

    //
    // Start unzipping before waiting on tmp directory (still needs to be buffered for BuildBot)
    //
    var buff = req.buffered.pipe(zlib.createGunzip()).pipe(new BufferedStream);

    tmp.dir({dir: app.config.get('directories:tmp')}, function (err, dir) {
      if (err) {
        res.writeHead(400);
        return res.end(err.message);
      }

      var jobDescription = merge.recursive({}, app.config.get('defaults:package') || {}, {
        //
        // Gyp is kinda picky about where it finds node installs
        //
        env: {
          // npm_config_nodedir: app.config.get('node:gypdir') + '/' + requestedVersion
        },
        // version: requestedVersion
      });
      //

      // Stream copy is not sufficient
      //
      jobDescription.repository = { type: 'tar-stream', stream: buff, destination: dir };

      if (pkg) {
        merge.recursive(jobDescription, pkg);
      }

      merge.recursive(jobDescription, app.config.get('spawning'));

      app.perform(
        'build.create',
        new BuildBot({
          versions: app.config.get('versions'),
          defaults: app.config.get('defaults:build')
        }),
        function (bot) {
          bot.build(jobDescription, function (err, tgz) {
            if (err) {
              res.writeHead(400);
              return err.stream ? err.stream.pipe(res) : res.end(err.message);
            }

            if (req.params.webhook) {
              var webhook = request({
                url: req.params.webhook,
                method: 'POST',
                headers: {
                  "content-type": 'application/tar+gzip'
                }
              }, function (err, webhookRes) {
                if (err) {
                  res.writeHead(500);
                  return res.end(err.message);
                }
                res.writeHead(webhookRes.statusCode, webhookRes.headers);
                webhookRes.pipe(res);
              });

              tgz.pipe(webhook);
            }
            else {
              res.writeHead(200, {
                'content-type': 'application/json'
              });
              res.end('"ok"');
            }
          });
        }
      );
    });
  });
};
