/*eslint-disable no-unused-vars*/
const server = require('http').createServer();
var io = require('socket.io')(server, { origins: 'dcam.pro:* http://dcam.pro:* http://www.dcam.pro:*' });
io.set('origins', '*:*');
io.attach(server, {
    pingInterval: 10000,
    pingTimeout: 5000,
    cookie: false
});

server.listen(3000, ``, 1, () => { console.log(`> > > listening`); });
/*eslint-enable no-unused-vars*/