/*
 * servers.js: Pluging to add `app.servers` properties.
 *
 * (C) 2012 Nodejitsu Inc.
 *
 */

var http = require('http'),
    https = require('https');

//
// Name this plugin.
//
exports.name = 'servers';

//
// ### function attach (options)
// #### @options {Object} Options for default HTTP(S) servers.
// Attaches this plugin by adding the `this.servers` property.
//
exports.attach = function (options) {
  var httpServer,
      httpsServer;

  this.servers = {
    get http() {
      return httpServer || (httpServer = http.createServer());
    },
    set http(value) {
      httpServer = value;
    },
    get https() {
      return httpsServer || (httpsServer = https.createServer(options.https));
    },
    set https(value) {
      httpsServer = value;
    }
  };
};