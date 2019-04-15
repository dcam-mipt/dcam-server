/*eslint-disable no-unused-vars*/
const server = require('http').createServer();
const io = require('socket.io')({
    path: '/websocket',
    serveClient: false,
});
io.set('origins', '*:*');
io.attach(server, {
    pingInterval: 10000,
    pingTimeout: 5000,
    cookie: false
});

server.listen(8080);
/*eslint-enable no-unused-vars*/