var os = require('os'),
    flatiron = require('flatiron'),
    merge = require('merge-recursive'),
    tmp = require('tmp'),
    exec = require('child_process').exec,
    Understudy = require('understudy').Understudy,
    ModuleSmith = require('module-smith');

var app = module.exports = Understudy.call(flatiron.app);

app.build = function (tgzStream, pkg, callback) {
  var app = this;

  tmp.dir({ dir: app.config.get('directories:tmp') }, function (err, dir) {
    if (err) {
      var error = new Error('unable to create tmp directory: ' + err.message);
      error.code = 500;
      callback(error, null);
    }

    var jobDescription = merge.recursive({env:{}}, app.config.get('defaults:package') || {});
    jobDescription.repository = { type: 'tar-stream', stream: tgzStream, destination: dir };

    if (pkg) {
      merge.recursive(jobDescription, pkg);
    }

    merge.recursive(jobDescription, app.config.get('spawning'), {
      directories: {
        rootdir: dir
      }
    });

    app.perform(
      'build.create',
      ModuleSmith.createModuleSmith({
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
    )
  });
};


app.start = function (options, callback) {
  options = options || {};
  callback = callback || function () { };

  app.config
    .argv()
    .file(options.configFile)
    .env()
    .defaults(options.defaults || {
      directories: {
        tmp: __dirname + '/../tmp'
      },
      node: {
        gypdir: process.env.HOME + '/.node-gyp',
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
