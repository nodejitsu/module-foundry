var path = require('path');
var Understudy = require('understudy').Understudy;
var checkout = require('checkout');
var tar = require('tar');
var async = require('async');
var chownr = require('chownr');
var zlib = require('zlib');
var fs = require('fs');
var spawn = require('child_process').spawn;
var fstream = require("fstream");
var uidNumber = require('uid-number');
var merge = require('merge-recursive');

//
// Extensible build bot
//
function BuildBot() {
  Understudy.call(this);
  return this;
}
module.exports = BuildBot;

//
// Perform the build
//
// TODO: dump builds of INDIVIDUAL MODULES to a cache directory
//

//
//  description.os
//  description.arch
//  description.version
//  description.options
//  description.env
//  description.repository
//  description.user
//  description.group
//

BuildBot.prototype.build = function build(description, callback/* err, tar-stream */) {
  var self = this;
  //
  // Allow configuration
  //
  async.waterfall([
      self.perform.bind(self, 'build.configure', null, description),
      function (description, callback) {
        async.parallel([
          fs.mkdir.bind(fs, description.repository.destination + '/build'),
          fs.mkdir.bind(fs, description.repository.destination + '/npm-cache'),
          fs.mkdir.bind(fs, description.repository.destination + '/tmp')
        ], function (err) {
          callback(err, description);
        })
      },
      self.perform.bind(self, 'repository.configure', null),
      function (description, callback) {
        var repository = Object.create(description.repository);
        repository.destination += '/build/module';
        checkout(repository, function (err) {
          callback(err, description);
        });
      },
      function (description, callback) {
        var dir = description.repository.destination;
        merge.recursive(description, {
          env: {
            PATH : process.env.PATH,
            HOME : dir,
            ROOT : dir,
            USER : description.user,
            TMPDIR : dir + '/tmp',
            npm_config_arch : description.arch,
            npm_config_user : description.user,
            npm_config_cache : dir+'/npm-cache',
            npm_config_globalconfig : dir+'/npmglobalrc',
            npm_config_userconfig : dir+'/npmlocalrc',
            //npm_config_loglevel : 'silly',
            npm_config_nodedir : process.env.HOME + '/.node-gyp/' + description.version
          }
        });
        uidNumber(description.user, description.group, function (err, uid, gid) {
          if (err) {
            callback(err);
            return;
          }
          chownr(description.repository.destination, uid, gid, function () {
            callback(err, description)
          });
        });
      },
      self.spawnNPM.bind(self)
  ], callback);
}

BuildBot.prototype.spawnNPM = function spawnNPM(description, callback) {
  var self = this;
  //
  // Default values
  //
  var rootdir = description.repository.destination;
  var builddir = rootdir + '/build';
  var moduledir = builddir + '/module';
  var spawnOptions = {
    options: description.options || [],
    spawnWith: {
      cwd: moduledir
    },
    env: description.env,
    user: description.user,
    group: description.group
  };
  //
  // Allow configuration
  //
  async.waterfall([
    self.perform.bind(self, 'npm.configure', null, spawnOptions),
    function (spawnOptions) {
      var builder = spawn('sudo', [
        '-u', spawnOptions.user
      ].concat(Object.keys(spawnOptions.env || {}).map(function (k) {
        return k + '=' + description.env[k];
      })).concat([
        '--',
        'npm', 'install',
      ]).concat(spawnOptions.options || []), {
        env: spawnOptions.env,
        cwd: moduledir
      });
      var logFile = fs.createWriteStream(builddir + '/npm-output.log');
      builder.stdout.pipe(logFile);
      builder.stderr.pipe(logFile);
      builder.on('exit', function (code) {
        if (code !== 0) {
          callback(new Error('npm exited with code ' + code));
          return;
        }
        //
        // Package the result
        //
        var pkgJSON = moduledir + '/package.json';
        async.parallel([
          fs.writeFile.bind(fs, builddir + '/spawnOptions.json', JSON.stringify(spawnOptions)),
          fs.writeFile.bind(fs, builddir + '/description.json', JSON.stringify(description))
        ], function (err) {
          if (err) {
            callback(err);
            return;
          }
          fs.readdir(moduledir + '/node_modules', function (err, files) {
            return fs.readFile(pkgJSON, function (err, body) {
              if (err) return callback(err);
              var pkg;
              try {
                pkg = JSON.parse(body);
              }
              catch (e) {
                return callback(e);
              }
              pkg.bundledDependencies = files;
              return fs.writeFile(pkgJSON, JSON.stringify(pkg), function (err) {
                if (err) return callback(err);
                var stream = fstream.Reader({ path: builddir, type: "Directory", isDirectory: true })
                  .pipe(tar.Pack({ noProprietary: true }))
                  .pipe(zlib.Gzip());
                return callback(null, stream);
              });
            });
          })
        })
      });
      self.perform('npm.wait', builder, function () {});
    }
  ], callback);
}