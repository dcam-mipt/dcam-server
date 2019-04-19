/*eslint-disable no-unused-vars*/
const server = require('http').createServer();
const io = require('socket.io')(server, { path: `/test` });

io.on('connection', (socket) => {
    console.log(`new connection`);
    socket.on('disconnect', (socket) => {
        console.log(`lost connection`);
    });
    socket.on('chat message', function (msg) {
        console.log('message: ' + msg);
        io.emit('chat message', msg);
    });
});

server.listen(3000);
/*eslint-enable no-unused-vars*/