/*eslint-disable no-unused-vars*/
var Parse = require(`parse/node`)
var config = require('./config')


// socket io
const socket_server = require('http').createServer((req, res) => { res.end('test') });
const io = require('socket.io')(socket_server);
socket_server.on('listening', () => { console.log('ok, server is running') });
socket_server.listen(3000);

// parse

Parse.initialize(config.PARSE_APP_ID, config.PARSE_JS_KEY, config.PARSE_MASTER_KEY);
Parse.serverURL = config.PARSE_SERVER_URL

let openClient = () => {
        let client = new Parse.LiveQueryClient({
                applicationId: config.PARSE_APP_ID,
                serverURL: config.PARSE_WS_URL,
                javascriptKey: config.PARSE_JS_KEY,
                masterKey: config.PARSE_MASTER_KEY
        });
        client.open()
        // error is here
        return client
}
let client = openClient()

let subscribe = (className, action) => {
        let client = openClient()
        let query = new Parse.Query(className)
        client.subscribe(query)
                .on('update', (object) => { action(object) })
                .on('create', (object) => { action(object) })
                .on('delete', (object) => { action(object) })
}

subscribe(`Laundry`, (d) => { io.emit(`Laundry`, `Laundry`) })
subscribe(`Verifications`, (d) => { io.emit(`Verifications`, d.get(`username`)) })
subscribe(`Balance`, (d) => { io.emit(`Balance`, d.get(`user_id`)) })
subscribe(`Constants`, (d) => { io.emit(`Constants`, `Constants`) })
subscribe(`Machines`, (d) => { io.emit(`Machines`, `Machines`) })
subscribe(`Transactions`, (d) => { io.emit(`Transactions`, d.get(`from`) + ` ` + d.get(`to`)) })

/*eslint-enable no-unused-vars*/