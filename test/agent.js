var supertest = require("supertest");
var _agents   = [];
var _port     = 3000;

module.exports = {
	create: create,
	clear: clear
};

function create (app) {
	var server = app.listen(_port++);
	_agents.push(server);
	return supertest.agent(server);
}

function clear () {
	for (var i = _agents.length; i--;) {
		_agents[i].close();
	}
	_agents = [];
}