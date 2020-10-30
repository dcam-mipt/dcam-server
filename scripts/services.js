/*eslint-disable*/
var Parse = require('parse/node')
var config = require('../config')
var { BookkeepingService } = require('./services/BookkeepingService')

Parse.initialize(config.PARSE_APP_ID, config.PARSE_JS_KEY, config.PARSE_MASTER_KEY);
Parse.serverURL = config.PARSE_SERVER_URL
Parse.User.enableUnsafeCurrentUser()


module.exports.Services = (server) => {
    BookkeepingService(server)
}
/*eslint-enable*/