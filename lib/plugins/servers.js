var http = require('http'),
    https = require('https');

exports.name = 'servers';

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