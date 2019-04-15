/*eslint-disable no-unused-vars*/
var express = require('express'),
    http = require('http');
var app = express();
var server = http.createServer(app);
var io = require('socket.io').listen(server);

server.listen(3000);
/*eslint-enable no-unused-vars*/