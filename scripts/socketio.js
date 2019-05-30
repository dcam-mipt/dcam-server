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
                applicationId: 'dcam',
                serverURL: 'ws://dcam.pro:1337/parse',
                javascriptKey: `dcam`,
                masterKey: `dcam`
        });
        client.open()
        // error is here
        return client
}

let createSubscriptionOnUpdate = (className, action) => {
        let client = openClient()
        let query = new Parse.Query(className)
        client.subscribe(query)
                .on('update', (object) => { action(object) })
                .on('create', (object) => { action(object) })
                .on('delete', (object) => { action(object) })
}

createSubscriptionOnUpdate(`Laundry`, (d) => { io.emit(`Laundry`, `Laundry`) })
createSubscriptionOnUpdate(`Verifications`, (d) => { io.emit(`Verifications`, d.get(`username`)) })
createSubscriptionOnUpdate(`Balance`, (d) => { io.emit(`Balance`, d.get(`user_id`)) })
createSubscriptionOnUpdate(`Constants`, (d) => { io.emit(`Constants`, `Constants`) })
createSubscriptionOnUpdate(`Machines`, (d) => { io.emit(`Machines`, `Machines`) })

/*eslint-enable no-unused-vars*/