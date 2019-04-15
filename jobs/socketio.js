/*eslint-disable no-unused-vars*/
const server = require('http').createServer();
const io = require('socket.io')(server);
io.on('connection', client => {
    client.on('event', data => { console.log(`event`) });
    client.on('disconnect', () => { console.log(`disconnect`) });
});
server.listen(3000);

/*eslint-enable no-unused-vars*/