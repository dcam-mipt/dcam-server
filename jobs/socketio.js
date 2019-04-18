/*eslint-disable no-unused-vars*/
var express = require('express');
var app = express();
var http = require('http')
var cors = require('cors')
app.use(cors())
app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    res.header("Access-Control-Allow-Headers", "Content-Type");
    res.header("Access-Control-Allow-Methods", "PUT, GET, POST, DELETE, OPTIONS");
    next();
});
app.get('/test', function (req, res, next) {
    res.json({ msg: 'This is CORS-enabled for all origins!' })
})

app.listen(3000, function () {
    console.log('CORS-enabled web server listening on port 3000')
})
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