/*
 * index.js: Top-level include for module-foundry.
 *
 * (C) 2012 Nodejitsu Inc.
 *
 */

var exec = require('child_process').exec,
    os = require('os'),
    path = require('path'),
    flatiron = require('flatiron'),
    merge = require('merge-recursive'),
    moduleSmith = require('module-smith'),
    rimraf = require('rimraf'),
    tmp = require('tmp'),
    Understudy = require('understudy').Understudy;

var app = module.exports = Understudy.call(flatiron.app);

//
// ### function build (tgzStream, pkg, callback)
// #### @options {Object} Options for this build run.
// ####   @stream  {Stream} Tarball stream to write the build to.
// ####   @package {Object} npm package to build.
// ####   @command {String} npm command to run.
// #### @callback  {function} Continuation to respond to.
// Builds the specified `pkg` to the given `tgzStream`.
//
app.build = function (options, callback) {
  var app = this,
      jobDescription,
      error;

  tmp.dir({ dir: app.config.get('directories:tmp') }, function (err, dir) {
    if (err) {
      error = new Error('unable to create tmp directory: ' + err.message);
      error.code = 500;
      return callback(error, null);
    }

    jobDescription = merge.recursive({ env: {} }, app.config.get('defaults') || {});
    jobDescription.repository = { type: 'tar-stream', stream: options.stream, destination: dir };

    if (options.package) {
      merge.recursive(jobDescription, options.package);
    }

    merge.recursive(jobDescription, app.config.get('spawning'), {
      directories: { rootdir: dir }
    });

    app.perform(
      'build.create',
      moduleSmith.createModuleSmith({
        versions: app.config.get('versions'),
        defaults: app.config.get('defaults:build')
      }),
      function (err, bot) {
        bot.build(jobDescription, function (err, tgz) {
          console.log('Removing: ' + dir);
          exec('rm -rf ' + dir, function (rerr) {
            //
            // Ignore errors removing the tmp directory
            //
            return !rerr
              ? console.log('Removed: ' + dir)
              : console.log(rerr.message);
          });

          return !err
            ? callback(null, tgz)
            : callback(err);
        });
      }
    );
  });
};

//
// ### function start (options, callback)
// #### @options  {Object}   Options to start the app with.
// #### @callback {function} Continuation to respond to.
// Starts the application with the given `options`.
//
app.start = function (options, callback) {
  options = options || {};
  callback = callback || function () { };

  app.config
    .argv()
    .file(options.configFile)
    .env()
    .defaults(options.defaults || {
      directories: {
        tmp: path.join(__dirname, '..', 'tmp')
      },
      node: {
        gypdir: path.join(process.env.HOME, '.node-gyp'),
        versions: [process.version.slice(1)]
      },
      spawning: {
        platform: os.platform(),
        arch: os.arch(),
        env: {
          npm_config_production: 'true'
        },
        uid: 'nobody'
        //gid: 'nobody'
      },
      defaults: {
        build: {
          version: '0.8.x'
        }
      }
    });

  //
  // Monitor and Repository support
  //
  app.use(require('./plugins/pluggable'));
  app.use(require('./plugins/servers'));
  app.use(require('./plugins/http'));
  require('./routes')(app, app.config.get('routes'));

  //
  // Start the application
  //
  app.init(callback);
};
