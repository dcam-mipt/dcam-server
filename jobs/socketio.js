/*eslint-disable no-unused-vars*/
var app = express();
var server = app.listen(3000);
var io = require('socket.io').listen(server);
/*eslint-enable no-unused-vars*/