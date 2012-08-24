#!/usr/bin/env node
//
// Module Foundary
//
// BuildBot for Node
//
// sudo PORT=${PORT:=80} node server.js
// tar -cz -C example/http-app/ . | curl -o out.tgz -H content-type:application/tar+gzip --data-binary @- localhost:${PORT:=80} -v
//
// TODO
// - semvers
// - plugin probes
// - module cache
// - more error checks
//

var zlib = require('zlib');
var BuildBot = require('../lib/buildbot');
var tmp = require('tmp');
var BufferedStream = require('morestreams').BufferedStream;
var arch = require('os').arch();


//
// Example server, should be fleshed out
//
var bot = new BuildBot();
var server = require('http').createServer(function (req, res) {
  var gunzip = zlib.createGunzip();
  var buff = new BufferedStream();
  tmp.dir(function (err, dir) {
    if (err) {
      res.writeHead(400);
      res.end(err.message);
      return;
    }
    var jobDescription = {
      version: '0.8.8',
      env: {
        HOME : dir,
        ROOT : dir,
        USER : 'nobody',
        TMPDIR : dir + '/tmp',
        npm_config_nodedir : process.env.HOME + '/.node-gyp' + '/' + process.version.slice(1),
        npm_config_arch : arch,
        npm_config_user : 'nobody',
        npm_config_cache : dir+'/npm-cache',
        npm_config_globalconfig : dir+'/.npmglobalrc',
        npm_config_userconfig : dir+'/.npmlocalrc'
      },
      user: 'nobody',
      repository: { type: 'tar-stream', stream: buff, destination: dir }
    };
    bot.build(jobDescription, function (err, tgz) {
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
  req.pipe(gunzip).pipe(buff);
});
server.listen(process.env.PORT || 80);