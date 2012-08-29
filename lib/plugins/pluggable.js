//
// Simple plugin to load other plugins via config.get('plugins')
//
exports.name = 'pluggable';
exports.attach = function () {
   var app = this;
   //
   // Grab all of our plugins to load
   //
   var plugins = app.config.get('plugins');
   //
   // Figure out the type (may vary due to things like optimist's argv)
   // .use it and any value attached to it
   //
   if (Array.isArray(plugins)) {
      plugins.forEach(function(pluginPath) {
         app.use(require(pluginPath));
      });
   }
   else if (typeof plugins === 'string') {
      app.use(require(plugins));
   }
   else if (typeof plugins === 'object') {
      Object.keys(plugins).forEach(function (pluginPath) {
         app.use(require(pluginPath), plugins[pluginPath]);
      });
   }
}