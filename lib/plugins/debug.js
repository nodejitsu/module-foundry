var net = require('net');
var repl = require('repl');
var util = require('util');
var assert = require('assert');
//
// Simple plugin to add a dumb debugging repl
//
// options.port = 1337
// options.host = '127.0.0.1'
// options.whitelist = ['127.0.0.1', {port: 1338, address: '127.0.0.2'}]
// options.columns = 80
// options.terminal = false
// options.useColors = false
// should repl context include `process`?
// options.excludeProcess = false
//
exports.name = 'debug';
exports.attach = function (options) {
   options = options || {};
   options.port = options.port !== null && options.port || 1337;
   options.columns = options.columns || 80;
   options.host = options.host || '127.0.0.1';
   var app = this;
   net.createServer(function (conn) {
      //
      // Check a whitelist of places we are allowed to connect from if specified
      //
      var remoteAddress = conn.remoteAddress;
      if (options.whitelist && !options.whitelist.some(function (whitelisted) {
         return typeof whitelisted === 'string' ?
            remoteAddress.address === whitelisted :
            whitelisted.port === remoteAddress.port && whitelisted.address === remoteAddress.address;
      })) {
         conn.destroy();
         return;
      }
      remoteAddress = null;
      conn.columns = options.columns || 80;
      var prompt = repl.start({
         input: conn,
         output: conn,
         terminal: options.terminal,
         useColors: options.useColors,
         useGlobal: false
      });
      prompt.on('exit', function () {
         conn.end();
      });
      //
      // Process can be dangerous but no real alterative that is liked for getting various data (not going to wrap it)
      //
      if (!options.excludeProcess) prompt.context.process = process;
      prompt.context.app = app;
      //
      // Repl should have console forwarded to it rather than printed on server
      //
      var times = {};
      prompt.context.console = {
         log: function () {
            conn.write([].slice.apply(arguments).map(util.inspect).join(' ') + '\n');
         },
         error: function () {
            conn.write([].slice.apply(arguments).map(util.inspect).join(' ') + '\n');
         },
         warn: function () {
            conn.write([].slice.apply(arguments).map(util.inspect).join(' ') + '\n');
         },
         info: function () {
            conn.write([].slice.apply(arguments).map(util.inspect).join(' ') + '\n');
         },
         dir: function (obj) {
            conn.write(util.inspect(obj) + '\n');
         },
         trace: function () {
            conn.write(new Error('Trace').stack + '\n');
         },
         time: function (id) {
            times[id] = Date.now();
         },
         timeEnd: function (id) {
            var time = times[id];
            if (time !== undefined) {
               conn.write(id + ': ' + (Date.now() - time) + 'ms\n');
               delete times[id];
            }
            else {
               conn.write(new Error('Error: No such label: '+id).stack + '\n');
            }
         },
         assert: function (cond) {
            try {
               assert(cond);
            }
            catch (e) {
               conn.write(e.stack + '\n');
            }
         }
      }
      prompt = null;
   }).listen(options.port, options.host);
}