//
// Example server, should be fleshed out
//
var fs = require('fs'),
    zlib = require('zlib'),
    BufferedStream = require('morestreams').BufferedStream;

module.exports = function (app, options) {
  //
  // /build
  //
  app.routers.authorized.post('/build', function () {
    var res = this.res,
        req = this.req,
        heartbeatTimer = setInterval(req.connection.write.bind(req.connection, ''), 60 * 1000),
        pkg = req.headers['x-package-json'];

    req.connection.setTimeout(20 * 60 * 1000);
    req.connection.on('close', function () {
      clearInterval(heartbeatTimer);
    });

    if (pkg) {
      try {
        pkg = JSON.parse(pkg);
      }
      catch (e) {
        res.writeHead(400);
        return res.end('unable to parse package.json: ' + e.message);
      }
    }

    var buff = req.buffered.pipe(zlib.createGunzip()).pipe(new BufferedStream);

    app.build(buff, pkg, function (err, tgz) {
      if (err) {
        var statusCode = isNaN(err.code) || err.code <= 0 || err.code >= 700 ? 400 : (err.code|0) || 400;
        res.writeHead(statusCode);
        return err.stream ? err.stream.pipe(res) : res.end(err.message);
      }

      if (req.params.webhook) {
        var webhook = request({
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
        res.writeHead(200, {
          'content-type': 'application/json'
        });
        res.end('"ok"');
      }
    });
  });
};
