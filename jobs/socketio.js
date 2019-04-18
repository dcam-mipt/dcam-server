/*eslint-disable no-unused-vars*/
var app = express();
var server = app.listen(3000);
var io = require('socket.io').listen(server);
var http = require('http');
/*eslint-enable no-unused-vars*/