var Parse = require('parse/node')
var config = require('../config')
var corsMiddleware = require('restify-cors-middleware');
var moment = require('moment-timezone')
var axios = require(`axios`)
var Mailer = require(`./MailAPI`)

Parse.initialize(config.PARSE_APP_ID, config.PARSE_JS_KEY, config.PARSE_MASTER_KEY);
Parse.serverURL = config.PARSE_SERVER_URL
Parse.User.enableUnsafeCurrentUser()

let to_start_of_hour = +moment().startOf(`hour`).add(1, `hour`) - +moment()
console.log(`> > >`);
console.log(to_start_of_hour);
console.log(`> > >`);