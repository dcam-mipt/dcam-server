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
server.use(restify.plugins.bodyParser({
    mapParams: true
}));
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

server.post(`/upload/`, (request, response, next) => {
    const data = Array.from(Buffer.from(request.body, 'binary'))
    const contentType = request.headers['content-type'];
    const parseFile = new Parse.File('logo.jpg', data, contentType)
    new Parse.Object(`pictures`)
        .set(`file`, parseFile)
        .save()
        .then((d) => { response.send(d); })
        .catch((d) => { response.send(d); })
})
/*eslint-enable no-unused-vars*/