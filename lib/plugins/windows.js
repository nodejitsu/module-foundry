/*
 * windows.js: Pluging to add appropriate hooks to build on Windows.
 *
 * (C) 2012 Charlie Robbins, Bradley Meck, and the Contributors
 *
 */

var fs = require('fs'),
    path = require('path'),
    spawn = require('child_process').spawn,
    async = require('async');

//
// Name this plugin
//
exports.name = 'windows';

//
// ### function attach ()
// Attaches this plugin by adding a before hook for
// 'npm.configure' for every build performed.
//
exports.attach = function () {
  if (process.platform !== 'win32') {
    //
    // WINDOWS ONLY! Prepare thyself...
    //
    return;
  }

  var app = this;

  //
  // ### function spawnBatch(script, args, next)
  // Spawns the specified batch `script` with the
  // `args` provided.
  //
  function spawnBatch(script, args, next) {
    if (!next && typeof args === 'function') {
      next = args;
      args = [];
    }

    var child = spawn(script, args, { env: process.env });
    child.stdout.pipe(process.stdout);
    child.stderr.pipe(process.stderr);
    child.on('exit', function () {
      //
      // Remark: These shouldn't error on a properly
      // configured Windows machine.
      //
      next();
    });
  }

  app.before('build.create', function (bot, done) {
    bot.before('npm.configure', function (description, next) {
      //
      // Execute the batch setup scripts for:
      // 1. Set any expanded PATH.
      // 2. Mixing extra ENV vars from Microsoft Windows SDK.
      // 3. Target Node.js version.
      //
      var cpu = description.cpu || 'x86';

      async.series([
        function setxPath(next) {
          return description.expand && description.expand.Path
            ? spawnBatch('setx', ['PATH', description.expand.Path.slice(1)], next)
            : next();
        },
        function extraEnv(next) {
          var expandPath = app.config.get(['arch', cpu, 'expand', 'Path'].join(':')),
              arch       = app.config.get(['arch', cpu, 'env'].join(':')),
              platform   = app.config.get('platform:windows:env');

          [arch, platform].forEach(function (obj) {
            if (obj && typeof obj === 'object') {
              Object.keys(obj).forEach(function (key) {
                description.env[key] = obj[key];
              });
            }
          });

          if (expandPath) {
            description.env.Path = description.env.Path
              || description.env.PATH
              || description.env.path
              || '';

            delete description.env.PATH;
            delete description.env.path;
            description.env.Path += expandPath;
          }

          next();
        },
        async.apply(spawnBatch, path.join(description.directories.node, 'nodevars.bat'))
      ], function (err) {
        return !err
          ? next(null, description)
          : next(err);
      });
    });

    done(null, bot);
  });
};

//
// ### function init (callback)
// #### @callback {function} Continuation to respond to.
// Initializes this plugin by read the specified directory
// containing all known node.js installations (from MSI).
//
exports.init = function (callback) {
  if (process.platform !== 'win32') {
    //
    // WINDOWS ONLY! Prepare thyself...
    //
    return callback();
  }

  var versionsDir  = this.config.get('directories:node'),
      expandPath   = this.config.get('defaults:expand:Path'),
      nodeVersions = {};

  //
  // ### function normalizeScripts(version, dir, next)
  // Node.js has a quirk on Windows that:
  //   - C:\node\v0.8.*\x86\nodejsvars.bat
  //   - C:\node\v0.10.*\x86\nodevars.bat
  //
  function normalizeScripts(version, dir, next) {
    if (/0\.8/.test(version)) {
      return fs.rename(
        path.join(dir, 'nodejsvars.bat'),
        path.join(dir, 'nodevars.bat'),
        next
      );
    }

    next();
  }

  //
  // Expand process.env.PATH if supplied.
  //
  if (expandPath) {
    process.env.Path += expandPath;
  }

  async.waterfall([
    //
    // 1. Read all of the node versions (e.g. `C:\node`)
    //
    async.apply(fs.readdir, versionsDir),
    //
    // 2. Read all of the architectures for all versions.
    //    (e.g. `C:\node\v0.8.25\x86`).
    //
    function readVersionsArch(dirs, done) {
      async.forEachLimit(dirs, 5, function readArch(version, next) {
        var dir = path.join(versionsDir, version);

        fs.readdir(dir, function (err, archs) {
          if (err) { return next(err) }
          nodeVersions[version] = archs;

          async.forEach(archs.map(function (arch) {
            return path.join(dir, arch);
          }), normalizeScripts.bind(null, version), next)
        });
      }, done);
    }
  ], callback);
};