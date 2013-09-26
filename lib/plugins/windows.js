/*
 * windows.js: Pluging to add appropriate hooks to build on Windows.
 *
 * (C) 2012 Nodejitsu Inc.
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
  var app = this;

  //
  // ### function spawnBatch(script, args, next)
  // Spawns the specified batch `script` with the
  // `args` provided.
  //
  function spawnBatch(script, args, next) {
    var child = spawn(script, args);

    //
    // TODO: Handle stdout and stderr
    //
    child.on('exit', function () {
      //
      // TODO: Handle exit codes.
      //
      next();
    })
  }

  app.before('build.create', function (bot, next) {
    bot.before('npm.configure', function (description, callback) {
      //
      // Execute the batch setup scripts for:
      // 1. Microsoft Windows SDK.
      // 2. Target Node.js version. 
      //
      // TODO: Handle specified architecture.
      // TODO: Properly handle nodePath and setup file
      //
      async.series([
        async.apply(spawnBatch, '/program files/microsoft sdks/windows/v7.1/bin/setenv.cmd', ['/x64', '/release']),
        async.apply(spawnBatch, path.join(description.nodePath, description.setup))
      ], callback);
    });
  });
};

//
// ### function init (callback)
// #### @callback {function} Continuation to respond to.
// Initializes this plugin by read the specified directory
// containing all known node.js installations (from MSI).
//
exports.init = function (callback) {
  var versionsDir  = this.config.get('directories:node-versions'),
      nodeVersions = {};
  
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
        fs.readdir(path.join(versionsDir, version), function (err, archs) {
          if (err) { return next() }
          nodeVersions[version] = archs;
          next();
        });
      }, done);
    }
  ], callback);
};