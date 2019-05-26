/*eslint-disable no-unused-vars*/
var restify = require('restify');
var CookieParser = require('restify-cookies');
var Parse = require('parse/node')
var corsMiddleware = require('restify-cors-middleware');
var moment = require('moment-timezone')
var axios = require(`axios`)

Parse.initialize(`e2xe5`, `e2xe5`, `e2xe5`);
Parse.serverURL = `http://dcam.pro:1337/parse_e2xe5/`
Parse.User.enableUnsafeCurrentUser()

var server = restify.createServer({ maxParamLength: 500 });
server.use(restify.plugins.bodyParser());
server.use(CookieParser.parse);

var cors = corsMiddleware({
    preflightMaxAge: 5,
    origins: ['*'],
    allowHeaders: ['*'],
    methods: ['GET', 'PUT', 'DELETE', 'POST', 'OPTIONS', `multipart/form-data`],
})
server.pre(cors.preflight)
server.use(cors.actual)
server.use(restify.plugins.queryParser())

server.listen(8081, () => {
    console.log('%s listening at %s', server.name, server.url);
});

server.get(`/balance/`, (request, response, next) => {
    // console.log(request.config.data);
    response.send(request);
})

server.post(`/upload/`, (request, response, next) => {
    response.send(`test`, request);
})
/*eslint-enable no-unused-vars*/