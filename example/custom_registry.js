/*
 * custom_registry.js: Example of using `module-foundry` with custom npm registry
 *
 * (C) 2012 Nodejitsu Inc.
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
    }),
    'x-npm-registry': 'https://registry.nodejitsu.com'
  }
}, function (err, res, body) {
  return err
    ? console.error('Error building module: ' + err.message)
    : console.log('Build completed: ' + body);
});
