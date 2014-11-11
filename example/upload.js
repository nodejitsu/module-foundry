/*
 * upload.js: Example of using `module-foundry` to upload after a build.
 *
 * (C) 2012 Charlie Robbins, Bradley Meck, and the Contributors
 *
 */

var request = require('request');

request({
  method: 'POST',
  uri: 'http://localhost:1337/build',
  qs: { 'npm-command': 'build' },
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
}, function (err, res, body) {
  return err
    ? console.error('Error building module: ' + err.message)
    : console.log('Build completed: ' + body);
});