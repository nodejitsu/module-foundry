var os = require('os'),
    flatiron = require('flatiron'),
    Understudy = require('understudy').Understudy

exports.start = function (options) {
  var app = Understudy.call(flatiron.app);
  
  app.config.argv().file(configFile).env().defaults({
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
      user: 'nobody',
      group: 'nobody'
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
  app.use(require('.plugins/pluggable'));
  app.use(require('./plugins/servers'));
  app.use(require('./plugins/http'));
  require('./routes')(app, app.config.get('routes'));
  
  //
  // Start the application
  //
  app.init();
};