/*
 * debug.js: Simple plugin to add a dumb debugging repl.
 *
 * (C) 2012 Charlie Robbins, Bradley Meck, and the Contributors
 *
 */

var net = require('net'),
    repl = require('repl'),
    util = require('util'),
    assert = require('assert');

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

//
// ### function attach (options)
// #### @options {Object} Options to attach with
// Attaches this plugin to the application by starting
// a net server with a repl using the specified options.
//
exports.attach = function (options) {
  var app = this;

  options         = options || {};
  options.port    = options.port !== null && options.port || 1337;
  options.columns = options.columns || 80;
  options.host    = options.host || '127.0.0.1';

  net.createServer(function (conn) {
    //
    // Check a whitelist of places we are allowed to connect from if specified
    //
    var remoteAddress = conn.remoteAddress,
        times = {},
        prompt;

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

    prompt = repl.start({
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
    // Process can be dangerous but no real alterative that is liked for getting
    // various data (not going to wrap it)
    //
    if (!options.excludeProcess) {
      prompt.context.process = process;
    }

    prompt.context.app = app;

    //
    // Repl should have console forwarded to it rather than printed on server
    //
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
          conn.write(new Error('Error: No such label: ' + id).stack + '\n');
        }
      },
      assert: function (cond) {
        try { assert(cond) }
        catch (e) { conn.write(e.stack + '\n') }
      }
    };

    prompt = null;
  }).listen(options.port, options.host);
};