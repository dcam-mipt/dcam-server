/*eslint-disable no-unused-vars*/
const server = require('http').createServer();
var io = require('socket.io')(server);
io.set('origins', '*:*');
io.attach(server, {
    pingInterval: 10000,
    pingTimeout: 5000,
    cookie: false
});

server.listen(3000);
/*eslint-enable no-unused-vars*/