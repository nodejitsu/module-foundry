/*
 * pluggable.js: Pluging to write build output to local disk.
 *
 * (C) 2012 Charlie Robbins, Bradley Meck, and the Contributors
 *
 */

var path = require('path');

//
// Simple plugin to load other plugins via config.get('plugins')
//
exports.name = 'pluggable';

//
// ### function fetchPlugin(pluginPath)
// Attempts to resolve the `pluginPath`.
//
function fetchPlugin(pluginPath) {
  pluginPath = path.resolve(__dirname, pluginPath)
  return require(pluginPath);
}

//
// ### function attach ()
// Attaches this plugin to the application by
// loading the specified plugins.
//
exports.attach = function () {
  //
  // Grab all of our plugins to load
  //
  var app     = this,
      plugins = app.config.get('plugins');

  //
  // Figure out the type (may vary due to things like optimist's argv)
  // .use it and any value attached to it
  //
  if (Array.isArray(plugins)) {
    plugins.forEach(function (pluginPath) {
      app.use(fetchPlugin(pluginPath));
    });
  }
  else if (typeof plugins === 'string') {
    app.use(fetchPlugin(plugins));
  }
  else if (typeof plugins === 'object') {
    Object.keys(plugins).forEach(function (pluginPath) {
      //
      // Set the app level config if it is not already present.
      //
      var existing = app.config.get(pluginPath);
      if (!existing) {
        app.config.set(pluginPath, plugins[pluginPath]);
      }

      console.log('Using plugin: %s', pluginPath);
      app.use(fetchPlugin(pluginPath), plugins[pluginPath]);
    });
  }
};