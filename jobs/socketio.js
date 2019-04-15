/*eslint-disable no-unused-vars*/
const io = require('socket.io')();
io.on('connection', client => { console.log(`socket.io: new connection -`, client); });
io.listen(3000);
/*eslint-enable no-unused-vars*/