/*eslint-disable no-unused-vars*/
var express = require('express');
var ParseServer = require('parse-server').ParseServer;
var path = require('path');

var api = new ParseServer({
    databaseURI: 'mongodb://localhost:27017/dev',
    appId: 'dcam',
    masterKey: 'dcam',
    javasScriptKey: 'dcam',
    serverURL: 'http://localhost:1337/parse',
    liveQuery: {
        classNames: []
    }
});

var e2xe5 = new ParseServer({
    databaseURI: 'mongodb://localhost:27017/dev2',
    appId: 'e2xe5',
    masterKey: 'e2xe5',
    javasScriptKey: 'e2xe5',
    serverURL: 'http://localhost:1337/parse_e2xe5',
    liveQuery: {
        classNames: []
    }
});

var app = express();

app.use('/public', express.static(path.join(__dirname, '/public')));

app.use('/parse', api);
app.use('/parse_e2xe5', e2xe5);

app.get('/', function (req, res) {
    res.status(200).send('I dream of being a website.  Please star the parse-server repo on GitHub!');
});

app.get('/test', function (req, res) {
    res.sendFile(path.join(__dirname, '/public/test.html'));
});

var port = 1337;
var httpServer = require('http').createServer(app);
httpServer.listen(port, function () {
    console.log('parse-server-example running on port ' + port + '.');
});

ParseServer.createLiveQueryServer(httpServer);

/*eslint-enable no-unused-vars*/