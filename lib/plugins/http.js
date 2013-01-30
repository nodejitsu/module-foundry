var url = require('url'),
    director = require('director'),
    BufferedStream = require('morestreams').BufferedStream;

exports.name = 'http-service';

exports.attach = function () {
  var app = this;

  //
  // Probes
  //
  // 1. http.incoming (reject connections / log from here) ->
  // 2. http.authorization (set req.authorization) ->
  // 2.1 http.authorized (do things)
  // 2.1 http.unauthorized (do things)
  //
  // Routing
  //
  // app.routers.authorized - req.authorized was populated during or before http.authorization
  // app.routers.unauthorized - req.authorized was not set or no authorized route was found
  // - will not be used if request is authorized but config.get('authorization:no-fallthrough') is truthy
  //
  app.routers = {
    authorized: new director.http.Router(),
    unauthorized: new director.http.Router()
  };
};

exports.init = function (done) {
  var app = this,
      listen = { expected: 0, current: 0 },
      responded = false;

  function workflow(req, res) {
    req.buffered = new BufferedStream();
    req.params = url.parse(req.url, true).query;
    req.pipe(req.buffered);
    app.perform('http.incoming', req, res, function getAuthorization(err, req, res, cleanup) {
      app.perform('http.authorization', req, res, function routeAuthorization(err, req, res, cleanup) {
        if (req.authorization) {
          app.perform('http.authorized', req, res, handleAuthorized);
        }
        else {
          app.perform('http.unauthorized', req, res, app.config.get('unauthorized:ok') ? handleAuthorized : handleUnauthorized);
        }
      });
    });
  }

  function handleUnauthorized(err, req, res, cleanup) {
    if (app.routers.unauthorized.dispatch(req, res)) return;

    //
    // Even if it is a 404, act like it is 403
    //
    res.writeHead(403);
    res.end();
  }

  function handleAuthorized(err, req, res, cleanup) {
    if (app.routers.authorized.dispatch(req, res)) return;
    if (app.routers.unauthorized.dispatch(req, res)) return;
    res.writeHead(404);
    res.end();
  }

  function onListen() {
    if (++listen.current >= listen.expected && !responded) {
      responded = true;
      return done();
    }
  }
  if (app.config.get('http')) {
    listen.expected++;
    app.servers.http.on('request', workflow);
    console.log('LISTENING')
    app.servers.http.listen(
      app.config.get('http:port') || 80,
      app.config.get('http:address') || '::1',
      onListen
    );
  }

  if (app.config.get('https')) {
    listen.expected++;
    app.servers.https.on('request', workflow);
    app.servers.https.listen(
      app.config.get('https:port') || 443,
      app.config.get('https:address') || '::1',
      onListen
    );
  }
};
