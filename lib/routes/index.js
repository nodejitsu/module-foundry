/*
 * routes.js: Routes for the `module-foundry` HTTP service.
 *
 * (C) 2012 Nodejitsu Inc.
 *
 */

var fs = require('fs'),
    request = require('request'),
    zlib = require('zlib'),
    BufferedStream = require('morestreams').BufferedStream;

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
        stream  = req.params.stream         || false,
        pkg     = req.headers['x-package-json'],
        heartbeatTimer;

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

    app.build({
      stream: req.buffered
        .pipe(zlib.createGunzip())
        .pipe(new BufferedStream),
      package: pkg,
      command: command
    }, function (err, tgz) {
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
            res.writeHead(500);
            return res.end(err.message);
          }
          res.writeHead(webhookRes.statusCode, webhookRes.headers);
          webhookRes.pipe(res);
        });

        tgz.pipe(webhook);
      }
      else {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end('"ok"');
      }
    });
  });
};
