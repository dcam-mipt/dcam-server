/*eslint-disable no-unused-vars*/
const server = require('http').createServer();
const io = require('socket.io')({
    path: '/websocket',
    serveClient: false,
});
io.origins('*:*')

// either
const server = require('http').createServer();

io.attach(server, {
    pingInterval: 10000,
    pingTimeout: 5000,
    cookie: false
});

server.listen(3000);

// or
io.attach(3000, {
    pingInterval: 10000,
    pingTimeout: 5000,
    cookie: false
});
/*eslint-enable no-unused-vars*/