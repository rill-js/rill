var URL  = require("url");
var join = require("join-url");

module.exports = mount;

function mount (app, config) {
	for (var type in config) {
		if (type in mounts) mounts[type](config[type], app);
	}

	app.url = URL.format(app.config) || "/";
	return app;
}

var mounts = {
	pathname: function (pathname, app) {
		pathname = join.pathname(app.config.pathname, pathname);
		if (pathname) app.config.pathname = pathname;
	},

	hostname: function (hostname, app) {
		hostname = join.hostname(app.config.hostname, hostname);
		if (hostname) app.config.hostname = hostname;
	},

	method: function (method, app) {
		if (method) app.config.method = method;
	}
};