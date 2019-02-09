var restify = require('restify');
var Parse = require('parse/node')
var config = require('./config')

Parse.initialize(config.PARSE_APP_ID, config.PARSE_JS_KEY, config.PARSE_MASTER_KEY);
Parse.serverURL = config.PARSE_SERVER_URL

var server = restify.createServer({ maxParamLength: 500 });
server.use(restify.plugins.bodyParser());

server.listen(8080, function () {
    console.log('%s listening at %s', server.name, server.url);
});

server.post('/', (req, res, next) => {
    console.log(` - - - > > > incoming request:`, req.body.label, req.body.amount, `RUB`)
    var transactions_q = new Parse.Query(`Transactions`)
    transactions_q.equalTo(`objectId`, req.body.label)
    transactions_q.first()
        .then((transaction) => {
            var balance_q = new Parse.Query(`Balance`)
            balance_q.equalTo(`userId`, transaction.get(`userId`))
            balance_q.first()
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