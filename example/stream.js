/*
 * stream.js: Example of using `module-foundry` to return a streamed tarball after a build.
 *
 * (C) 2012 Nodejitsu Inc.
 *
 */

var fs = require('fs'),
    path = require('path'),
    request = require('request');

var fstream = fs.createWriteStream(path.join(__dirname, 'bcrypt-0.7.7.tgz'));

request({
  method: 'POST',
  uri: 'http://localhost:1337/build',
  qs: {
    'npm-command': 'build',
    stream: true
  },
  headers: {
    'x-package-json': JSON.stringify({
      engines: { node: '0.8.x' },
      repository: {
        type: 'npm',
        package: 'bcrypt',
        version: '0.7.7'
      }
    })
  }
}).pipe(fstream);