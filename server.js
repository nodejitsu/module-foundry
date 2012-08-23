#!/usr/bin/env node
//
// Module Foundary
//
// BuildBot for Node
//
// tar -cz -C example/http-app/ . | curl -o out.tgz -H content-type:application/tar+gzip --data-binary @- localhost:${PORT:=80} -v
//
// TODO
// - semvers
// - plugin probes
// - module cache
// - more error checks
//

var Understudy = require('understudy').Understudy;
var Repository = require('repositron').Repository;
var tar = require('tar');
var async = require('async');
var uuid = require('uuid-v4');
var chownr = require('chownr');
var zlib = require('zlib');
var fs = require('fs');
var spawn = require('child_process').spawn;
var fstream = require("fstream");
var BufferedStream = require('morestreams').BufferedStream;

var platform = require('os').platform();
var arch = require('os').arch();

//
// Extensible build bot
//
function BuildBot() {
  Understudy.call(this);
  return this;
}

//
// Make a directory we can use when building
//
BuildBot.prototype.getBuildDirectory = function (cb) {
  var dir = process.env.TEMPDIR || (process.env.HOME + '/tmp');
  dir += '/' + uuid();
  fs.mkdir(dir, function (err) {
    if (err) {
      cb(err);
      return;
    }
    async.parallel([
      fs.mkdir.bind(fs, dir + '/package'),
      fs.mkdir.bind(fs, dir + '/npm-cache'),
      fs.mkdir.bind(fs, dir + '/tmp')
    ], function (err) {
      cb(err, dir);
    });
  });
}

//
// Perform the build
//
// TODO: dump builds of INDIVIDUAL MODULES to a cache directory
//

//  description.os
//  description.arch
//  description.version
//  description.argv;
//  description.env;
//  description.repository;

BuildBot.prototype.build = function build(description, callback/* err, tar-stream */) {
  //
  // Determine where the build will be placed
  //
  if (description.os && description.os !== platform) {
    callback(new Error('Invalid platform'));
    return;
  }
  this.getBuildDirectory(function (err, dir) {
    //
    // Download the source
    //
    var repositoryDescription = Object.create(description.repository);
    repositoryDescription.destination = dir + '/package';
    new Repository(repositoryDescription).download(function (err) {
      console.log('DOWNLOADED REPO TO LOCAL DIR', err)
      if (err) {
        callback(err);
        return;
      }
      var targetTarball = dir + '/package.tgz';
      chownr(dir, -2, -2, runNPM);
      function runNPM(err) {
        console.log('CHOWNED', err)
        if (err) {
          callback(err);
          return;
        }
        //
        // Run the build
        //
        var builder = spawn('sudo', [
                       '-u', 'nobody'
                      ].concat(Object.keys(description.env || {}).map(function (k) {
                        return k+'='+description.env[k];
                      })).concat([
                        'HOME=' + dir,
                        'ROOT=' + dir,
                        'USER=' + 'nobody',
                        'TMPDIR=' + dir + '/tmp',
                        'npm_config_nodedir='+(this.nodedir || process.env.HOME + '/.node-gyp')+'/'+(description.version || process.version.slice(1)),
                        'npm_config_arch='+(this.arch || arch),
                        'npm_config_user=nobody',
                        'npm_config_cache='+dir+'/npm-cache',
                        'npm_config_globalconfig='+dir+'/.npmglobalrc',
                        'npm_config_userconfig='+dir+'/.npmlocalrc',
                       'npm', 'install',
                      ]).concat(description.argv || []), {
                        cwd: dir + '/package'
                      }
        );
        builder.on('exit', function (code) {
          if (code !== 0) {
            callback(new Error('npm exited with code ' + code));
            return;
          }
          //
          // Package the result
          //
          var stream = fstream.Reader({ path: dir + '/package', type: "Directory", isDirectory: true })
          .pipe(tar.Pack({ noProprietary: true }))
          .pipe(zlib.Gzip());
          callback(null, stream);
        });
      };
    });
  });
}

//
// Example server, should be fleshed out
//
var server = require('http').createServer(function (req, res) {
  var gunzip = zlib.createGunzip();
  var buff = new BufferedStream();
  req.pipe(gunzip).pipe(buff);
  new BuildBot().build({
    repository: { type: 'tar-stream', stream: buff }
  }, function (err, tgz) {
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
server.listen(process.env.PORT || 80);