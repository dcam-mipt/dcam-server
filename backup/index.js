/*eslint-disable no-unused-vars*/
var exec = require('child_process').exec;
var config = require('../config')

Parse.initialize(config.PARSE_APP_ID, config.PARSE_JS_KEY, config.PARSE_MASTER_KEY);
Parse.serverURL = config.PARSE_SERVER_URL
Parse.User.enableUnsafeCurrentUser()

let create_notification = async (user_id, message, delivery_timestamp) => await new Parse.Object(`Notifications`)
    .set(`delivery_timestamp`, delivery_timestamp ? delivery_timestamp : +moment().tz(`Europe/Moscow`))
    .set(`status`, `delayed`)
    .set(`user_id`, user_id)
    .set(`message`, message)
    .save()

let backup = () => {
    exec(`node upload.js`, () => {
        create_notification(227992175, `> > > backup created`)
        // setTimeout(() => { backup() }, 60000 * 0.5)
    })
}

backup()

/*eslint-enable no-unused-vars*/