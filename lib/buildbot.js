var path = require('path'),
    zlib = require('zlib'),
    fs = require('fs'),
    spawn = require('child_process').spawn,
    async = require('async'),
    BufferedStream = require('morestreams').BufferedStream,
    checkout = require('checkout'),
    chownr = require('chownr'),
    fstream = require('fstream'),
    merge = require('merge-recursive'),
    semver = require('semver'),
    tar = require('tar'),
    uidNumber = require('uid-number'),
    Understudy = require('understudy').Understudy;

//
// Extensible build bot
//
var BuildBot = module.exports = function BuildBot(options) {
  Understudy.call(this);
  options = options || {};
  options.versions = options.versions || [process.version.slice(1)];
  options.defaults = options.defaults || {};
  this.versions = options.versions;
  this.defaults = options.defaults;
  return this;
};

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
  console.error(description);
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
      });
    },
    self.perform.bind(self, 'repository.configure', null),
    function (description, callback) {
      var repository = Object.create(description.repository);
      repository.destination += '/build';
      checkout(repository, function (err) {
        callback(err, description);
      });
    },
    function (description, callback) {
      var dir = description.repository.destination,
          pkg = path.join(dir, 'build', 'package', 'package.json');

      fs.readFile(pkg, function (err, contents) {
        if (err) {
          return callback(err, null);
        }

        var pkgJSON = JSON.parse(contents);
        if (!description.version) {
          var engines = pkgJSON.engine || pkgJSON.engines;
          if (typeof engines === 'string') {
            description.version = semver.maxSatisfying(self.versions, engines);
          }
          else if (engines && engines.node) {
            description.version = semver.maxSatisfying(self.versions, engines.node);
          }
          else {
            description.version = semver.maxSatisfying(self.versions, self.defaults.version || process.version.slice(1));
          }
        }

        if (!description.version) {
          return callback(new Error('No matching versions found'));
        }

        console.error('installing with version', description.version)
        merge.recursive(description, {
          env: {
            PATH: process.env.PATH,
            HOME: dir,
            ROOT: dir,
            USER: description.user,
            LDFLAGS: '-m64',
            CFLAGS: '-m64',
            CPPFLAGS: '-m64',
            CXXFLAGS: '-m64',
            TMPDIR: dir + '/tmp',
            npm_config_user: description.user,
            npm_config_arch: description.arch,
            npm_config_production: true,
            npm_config_cache: dir + '/npm-cache',
            npm_config_globalconfig: dir + '/npmglobalrc',
            npm_config_userconfig: dir + '/npmlocalrc',
            'npm_config_node-version': description.version,
            //npm_config_loglevel : 'silly',
            npm_config_nodedir: process.env.HOME + '/.node-gyp/' + description.version
          }
        });

        Object.keys(pkgJSON.env || {}).forEach(function (key) {
          if (!description.env[key]) description.env[key] = pkgJSON.env[key];
        });

        uidNumber(description.user, description.group, function (err, uid, gid) {
          if (err) {
            return callback(err);
          }

          chownr(description.repository.destination, uid, gid, function () {
            callback(err, description)
          });
        });
      });
    },
    self.spawnNPM.bind(self)
  ], callback);
}

BuildBot.prototype.spawnNPM = function spawnNPM(description, callback) {
  var self = this,
      rootdir = description.repository.destination,
      builddir = rootdir + '/build',
      moduledir = builddir + '/package',
      spawnOptions;

  //
  // Default values
  //
  spawnOptions = {
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
      var builder = spawn('sudo',
        ['-u', spawnOptions.user]
          .concat(Object.keys(spawnOptions.env || {}).map(function (k) {
            return k + '=' + description.env[k];
          }))
          .concat([
            '--',
            'npm', 'install',
          ])
          .concat(spawnOptions.options || []),
        {
          env: spawnOptions.env,
          cwd: moduledir
        }
      );

      var logFile = fs.createWriteStream(builddir + '/npm-output.log');

      builder.stdout.pipe(logFile);
      builder.stderr.pipe(logFile);

      var npmOutput = new BufferedStream();

      builder.stdout.pipe(npmOutput);
      builder.stderr.pipe(npmOutput);
      builder.stdout.pipe(process.stdout);
      builder.stderr.pipe(process.stderr);
      builder.on('exit', function (code) {
        console.error('npm.exit', arguments)
        if (code !== 0) {
          var err = new Error('npm exited with code ' + code);
          err.stream = npmOutput;
          return callback(err, null);
        }
        npmOutput = null;

        //
        // Package the result
        //
        var pkgJSON = moduledir + '/package.json';

        async.parallel([
          fs.writeFile.bind(fs, builddir + '/spawnOptions.json', JSON.stringify(spawnOptions)),
          fs.writeFile.bind(fs, builddir + '/description.json', JSON.stringify(description))
        ], function (err) {
          console.error('FIRING FINALIZATION', err);
          if (err) {
            return callback(err);
          }

          fs.readdir(moduledir + '/node_modules', function (err, files) {
            if (err && err.code === 'ENOENT') {
              files = [];
            }

            return fs.readFile(pkgJSON, function (err, body) {
              if (err) {
                return callback(err);
              }

              var pkg;

              try { pkg = JSON.parse(body) }
              catch (e) { return callback(e) }

              pkg.bundledDependencies = files.filter(function (file) {
                return file !== ".bin";
              });

              pkg.env = pkg.env || {};
              pkg.env['npm_config_rebuild_bundle'] = false;
              pkg.env['npm_config_production'] = true;

              return fs.writeFile(pkgJSON, JSON.stringify(pkg), function (err) {
                if (err) {
                  return callback(err);
                }

                var done = false;

                function finish() {
                  if (!done) {
                    done = true;
                    return callback.apply(this, arguments);
                  }
                }

                var stream = fstream.Reader({ path: moduledir, type: "Directory", isDirectory: true })
                  .on('error', finish)
                  .pipe(tar.Pack({ noProprietary: true })
                  .on('error', finish))
                  .pipe(zlib.Gzip().on('error', finish))
                  .pipe(new BufferedStream().on('error', finish))
                  .on('end', finish);

                return self.perform('build.output', null, description, stream, function () {});
              });
            });
          })
        })
      });
      self.perform('npm.wait', builder, function () {});
    }
  ], callback);
};

