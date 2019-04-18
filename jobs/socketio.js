/*eslint-disable no-unused-vars*/
var express = require('express');
var app = express();
app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    res.header("Access-Control-Allow-Headers", "Content-Type");
    res.header("Access-Control-Allow-Methods", "PUT, GET, POST, DELETE, OPTIONS");
    next();
});
var server = http.createServer(app);
const io = require('socket.io')(server, {});

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