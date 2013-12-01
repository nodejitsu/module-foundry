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
// ####   @req     {ServerRequest}  Server request associated with this build.
// ####   @res     {ServerResponse} Server response associated with this build.
// #### @callback  {function} Continuation to respond to.
// Builds the specified `pkg` to the given `tgzStream`.
//
app.build = function (options, callback) {
  var app = this,
      req = options.req,
      jobDescription,
      cleanTimeout,
      cleaned,
      error;

  tmp.dir({ dir: app.config.get('directories:tmp') }, function (err, dir) {
    if (err) {
      error = new Error('unable to create tmp directory: ' + err.message);
      error.code = 500;
      return callback(error, null);
    }

    //
    // ### function cleanBuild ()
    // Helper function which attempts to remove the build directory
    //
    function cleanBuild() {
      if (!cleaned) {
        cleaned = true;
        clearTimeout(cleanTimeout);
        if (app.config.get('auto-cleanup') !== false) {
          console.log('Removing: ' + dir);
          exec('rm -rf ' + dir, function (rerr) {
            //
            // Ignore errors removing the tmp directory
            //
            return !rerr
              ? console.log('Removed: ' + dir)
              : console.log(rerr.message);
          });
        }
      }
    }

    jobDescription = merge.recursive({ env: {} }, app.config.get('defaults') || {});
    jobDescription.repository = {
      gzip: true,
      type: 'tar-stream',
      stream: options.stream,
      destination: dir
    };

    //
    // Merge in package options if supplied.
    //
    if (options.package) {
      merge.recursive(jobDescription, options.package);
      if (options.package.repository) {
        options.package.repository.destination = dir;
      }
    }

    //
    // Specify the npm command if supplied.
    //
    if (options.command) {
      jobDescription.command = options.command;
    }

    merge.recursive(jobDescription, app.config.get('spawning'), {
      directories: { root: dir }
    });

    app.perform(
      'build.create',
      moduleSmith.createModuleSmith({
        versions: app.config.get('versions'),
        defaults: app.config.get('defaults:build')
      }),
      function (err, bot) {
        //
        // Default to always stream logs back when you do
        // not have `?stream=true` set
        //
        if (!req.params.stream) {
          options.res.setHeader('content-type', 'text/plain');
          options.res.setHeader('transfer-encoding', 'chunked');
          bot.on('npm.spawned', function (desc, builder) {
            ['stdout', 'stderr'].forEach(function (stream) {
              builder[stream].on('data', function (d) {
                options.res.write(d);
              });
            });
          });
        }

        bot.build(jobDescription, function (err, description, tgz) {
          if (err) {
            console.log('Error: ' + err.message);
            if (err.stack) {
              console.log(err.stack);
            }
          }

          //
          // Remove the build directory when:
          //  1. If there is a ServerResponse: once the response has completed,
          //    or 15 minutes have elapsed.
          //  2. If no ServerResponse: immediately.
          //
          if (!options.res) { cleanBuild() }
          else {
            cleanTimeout = setTimeout(cleanBuild, 15 * 60 * 1000);
            options.res.once('finish', cleanBuild);
          }

          return !err
            ? callback(null, description, tgz)
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
  options  = options  || {};
  callback = callback || function () { };

  //
  // Use the correct HOME directory on Windows.
  //
  var homedir = process.platform === 'win32'
    ? process.env.HOMEPATH
    : process.env.HOME;

  app.config
    .argv()
    .file(options.configFile)
    .env()
    .defaults(options.defaults || {
      directories: { tmp: path.join(__dirname, '..', 'tmp') },
      node: {
        gyp: path.join(homedir, '.node-gyp'),
        versions: [process.version.slice(1)]
      },
      spawning: {
        //gid: 'nobody'
        uid: 'nobody',
        env: { npm_config_production: 'true' },
        platform: process.platform,
        cpu: process.platform !== 'win32' || process.arch !== 'ia32'
          ? process.arch
          : 'x86'
      },
      defaults: {
        build: { version: '0.8.x' }
      }
    });

  //
  // Monitor and Repository support
  //
  app.use(require('./plugins/windows'));
  app.use(require('./plugins/pluggable'));
  app.use(require('./plugins/servers'));
  app.use(require('./plugins/http'));
  require('./routes')(app, app.config.get('routes'));

  //
  // Start the application
  //
  app.init(callback);
};
