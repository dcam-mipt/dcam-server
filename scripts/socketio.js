/*eslint-disable no-unused-vars*/
const server = require('http').createServer((req, res) => { res.end('test') });
const io = require('socket.io')(server);

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

server.on('listening', () => { console.log('ok, server is running') });
server.listen(3000);
/*eslint-enable no-unused-vars*/