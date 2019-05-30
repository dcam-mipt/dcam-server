/*eslint-disable no-unused-vars*/
const socket_server = require('http').createServer((req, res) => { res.end('test') });
const io = require('socket.io')(socket_server);
const {subscripiton} = require('./parse_api')
socket_server.on('listening', () => { console.log('ok, server is running') });
socket_server.listen(3000);

for (let i in [`create`, `update`, `delete`]) {
        subscripiton(`Laundry`, i, (d) => { io.emit(`Laundry`, `Laundry`) })
        subscripiton(`Verifications`, i, (d) => { io.emit(`Verifications`, d.get(`username`)) })
        subscripiton(`Balance`, i, (d) => { io.emit(`Balance`, d.get(`user_id`)) })
        subscripiton(`Constants`, i, (d) => { io.emit(`Constants`, `Constants`) })
        subscripiton(`Machines`, i, (d) => { io.emit(`Machines`, `Machines`) })
}

/*eslint-enable no-unused-vars*/