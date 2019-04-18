/*eslint-disable no-unused-vars*/
const server = require('http').createServer();
const io = require('socket.io')(server, {});

server.listen(3000);
/*eslint-enable no-unused-vars*/