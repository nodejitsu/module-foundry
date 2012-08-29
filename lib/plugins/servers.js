var http = require('http');
var https = require('https');
exports.name = 'servers';
exports.attach = function (options) {
   var httpServer;
   var httpsServer;
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
}