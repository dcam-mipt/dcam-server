var restify = require('restify');
var Parse = require('parse/node')
var config = require('./config')
var corsMiddleware = require('restify-cors-middleware');
var moment = require('moment-timezone')

Parse.initialize(config.PARSE_APP_ID, config.PARSE_JS_KEY, config.PARSE_MASTER_KEY);
Parse.serverURL = config.PARSE_SERVER_URL
Parse.User.enableUnsafeCurrentUser()

var server = restify.createServer({ maxParamLength: 500 });
server.use(restify.plugins.bodyParser());

var cors = corsMiddleware({
    preflightMaxAge: 5,
    origins: ['*'],
    allowHeaders: ['*'],
    methods: ['GET', 'PUT', 'DELETE', 'POST', 'OPTIONS']
})
server.pre(cors.preflight)
server.use(cors.actual)
server.use(restify.plugins.queryParser())

server.listen(config.REST_PORT, () => {
    console.log('%s listening at %s', server.name, server.url);
});

server.post('/yandex/', (req, res, next) => {
    console.log(` - - - > > > incoming request:`, req.body.label, req.body.amount, `RUB`)
    var transactions_q = new Parse.Query(`Transactions`)
    transactions_q.equalTo(`objectId`, req.body.label)
    transactions_q.first()
        .then((transaction) => {
            new Parse.Query(`Balance`)
                .equalTo(`userId`, transaction.get(`userId`))
                .first()
                .then((balance) => {
                    if (transaction.get(`status`) !== `done`) {
                        balance.set(`money`, balance.get(`money`) + +req.body.withdraw_amount)
                        balance.save()
                    }
                    transaction.set(`status`, `done`)
                    transaction.set(`recived`, +req.body.withdraw_amount)
                    transaction.set(`recived`, +req.body.amount)
                    transaction.save()
                        .then((d) => { console.log(d) })
                        .catch((d) => { console.log(d) })
                })
                .catch((d) => { console.log(d) })
        })
        .catch((d) => { console.log(d) })
});

let createOneBook = (request, user, group_id, week_number) => {
    return new Promise((resolve, reject) => {
        var club_query = Parse.Object.extend(`Club`);
        var club_record = new club_query();
        club_record.set(`userId`, user.id)
        club_record.set(`location`, request.body.location)
        club_record.set(`start_timestamp`, +moment(request.body.start_timestamp).tz(`Europe/Moscow`).add(week_number, `week`))
        club_record.set(`end_timestamp`, +moment(request.body.end_timestamp).tz(`Europe/Moscow`).add(week_number, `week`))
        club_record.set(`is_regular`, request.body.is_regular)
        club_record.set(`is_allowed`, false)
        club_record.set(`data`, request.body.data)
        club_record.set(`group_id`, group_id)
        club_record.save()
            .then((d) => { console.log(`> > >`); resolve(d) })
            .catch((d) => { reject(d) })
    })
}

// create club book
server.post(`/club/create_book/`, (request, response, next) => {
    let sessionToken = request.headers.sessiontoken
    let group_id = request.body.is_regular ? Math.random().toString(36).substring(2, 10) : undefined
    Parse.User.become(sessionToken)
        .then((user) => {
            let week_number = 0
            let deal = () => {
                createOneBook(request, user, group_id, week_number)
                    .then((d) => {
                        if (+moment(request.body.start_timestamp).tz(`Europe/Moscow`).add(week_number, `week`) < +request.body.data.end_of_repeat) {
                            week_number++
                            deal()
                        }
                    })
                    .catch((d) => { response.send(d) })
            }
            deal()
        })
        .catch((d) => { response.send(d) })
});

// get user
server.get(`/users/get/`, (request, response, next) => {
    let sessionToken = request.headers.sessiontoken
    Parse.User.become(sessionToken)
        .then((user) => {
            new Parse.Query(`User`)
                .equalTo(`objectId`, request.body.user_id)
                .then((d) => { response.send(d) })
                .catch((d) => { response.send(d) })
        })
        .catch((d) => { response.send(d) })
});