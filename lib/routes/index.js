/*
 * routes.js: Routes for the `module-foundry` HTTP service.
 *
 * (C) 2012 Nodejitsu Inc.
 *
 */

var fs = require('fs'),
    zlib = require('zlib'),
    request = require('request'),
    streams = require('readable-stream');

//
// ### function exports (app, options)
// #### @app     {Object} Application to attach routes to
// #### @options {Object} Options for routes
// Attaches the given routes to the `app`:
//   * `/build`: Builds the given npm package.
//
module.exports = function (app, options) {
  //
  // ### POST /build
  // Builds the specified npm package.
  //
  app.routers.authorized.post('/build', function () {
    var res     = this.res,
        req     = this.req,
        command = req.params['npm-command'] || 'install',
        pkg     = req.headers['x-package-json'],
        heartbeatTimer,
        buffer;

    //
    // Setup heartbeatTimer to ensure that connections are not
    // prematurely closed.
    //
    heartbeatTimer = setInterval(req.connection.write.bind(req.connection, ''), 60 * 1000);
    req.connection.setTimeout(20 * 60 * 1000);
    req.connection.on('close', function () {
      clearInterval(heartbeatTimer);
    });

    if (pkg) {
      try { pkg = JSON.parse(pkg) }
      catch (e) {
        res.writeHead(400);
        return res.end('unable to parse package.json: ' + e.message);
      }
    }

    //
    // Assume that no tarball is inbound streamed when a `.repository`
    // is passed into `x-package-json`.
    //
    if (pkg.repository) {
      delete req.buffered;
    }

    app.build({
      stream: buffer,
      package: pkg,
      command: command,
      res: res
    }, function (err, description, tgz) {
      var statusCode,
          webhook;

      if (err) {
        statusCode = isNaN(err.code) || err.code <= 0 || err.code >= 700 ? 400 : (err.code|0) || 400;
        res.writeHead(statusCode);
        return err.stream ? err.stream.pipe(res) : res.end(err.message);
      }

      if (req.params.webhook) {
        webhook = request({
          url: req.params.webhook,
          method: 'POST',
          headers: {
            "content-type": 'application/tar+gzip'
          }
        }, function (err, webhookRes) {
          if (err) {
            res.writeHead(500, webhookRes.headers || { 'content-type': 'text/plain' });
            return res.end(err.message);
          }

          res.writeHead(webhookRes.statusCode, webhookRes.headers);
          webhookRes.pipe(res);
        });

        tgz.pipe(webhook);
        return;
      }
      else if (req.params.stream) {
        res.writeHead(200, { 'content-type': 'application/tar+gzip' });
        tgz.pipe(res);
        return;
      }

      res.writeHead(200, { 'content-type': 'application/json' });
      res.end('"ok"');
    });
  });
};
