var Parse = require('parse/node')
var config = require('../config')
var corsMiddleware = require('restify-cors-middleware');
var moment = require('moment-timezone')
var axios = require(`axios`)
var Mailer = require(`./MailAPI`)

Parse.initialize(config.PARSE_APP_ID, config.PARSE_JS_KEY, config.PARSE_MASTER_KEY);
Parse.serverURL = config.PARSE_SERVER_URL
Parse.User.enableUnsafeCurrentUser()

let get_laundry = () => {
    let laundry = new Parse.Query(`Laundry`)
        .greaterThanOrEqualTo(`timestamp`, +moment().tz(`Europe/Moscow`).startOf(`isoWeek`))
        .limit(1000000)
        .find()
}

let to_start_of_hour = +moment().startOf(`minute`).add(1, `minute`) - +moment()
setTimeout(() => {
    setInterval(() => {
        Mailer.sendEmail({ email: `beldiy.dp@phystech.edu`, subject: `dev`, html: `
            <html>
            <div>${moment().tz(`Europe/Moscow`).format(`HH:mm`)}</div>
            </html>
        ` })
    }, 1000 * 60)
}, to_start_of_hour)