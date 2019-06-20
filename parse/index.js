/*eslint-disable no-unused-vars*/
var express = require('express');
var ParseServer = require('parse-server').ParseServer;
var path = require('path');
var config = require('./config')

var api = new ParseServer({
    databaseURI: config.MONGO_DB_URL,
    appId: config.PARSE_APP_ID,
    masterKey: config.PARSE_MASTER_KEY,
    javasScriptKey: config.PARSE_JS_KEY,
    serverURL: config.PARSE_SERVER_URL,
    liveQuery: {
        classNames: config.LIVE_QUERY_CLASSES
    }
});

var app = express();

app.use('/public', express.static(path.join(__dirname, '/public')));

app.use('/parse', api);

app.get('/', function (req, res) {
    res.status(200).send('I dream of being a website.  Please star the parse-server repo on GitHub!');
});

app.get('/test', function (req, res) {
    res.sendFile(path.join(__dirname, '/public/test.html'));
});

var port = config.PARSE_PORT;
var httpServer = require('http').createServer(app);
httpServer.listen(port, function () {
    console.log('parse-server-example running on port ' + port + '.');
});
ParseServer.createLiveQueryServer(httpServer);

ParseServer.createLiveQueryServer(httpServer);

/*eslint-enable no-unused-vars*/