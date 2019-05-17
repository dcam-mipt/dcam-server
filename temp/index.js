/*eslint-disable no-unused-vars*/
var express = require('express');
var ParseServer = require('parse-server').ParseServer;
var path = require('path');

var api = new ParseServer({
    databaseURI: 'mongodb://localhost:27017/dev',
    cloud: __dirname + '/cloud/main.js',
    appId: 'dcam',
    masterKey: 'dcam',
    javasScriptKey: 'dcam',
    serverURL: 'http://localhost:1337/parse',
    liveQuery: {
        classNames: []
    }
});

var app = express();

app.use('/public', express.static(path.join(__dirname, '/public')));

var mountPath = process.env.PARSE_MOUNT || '/parse';
app.use(mountPath, api);

app.get('/', function (req, res) {
    res.status(200).send('I dream of being a website.  Please star the parse-server repo on GitHub!');
});

app.get('/test', function (req, res) {
    res.sendFile(path.join(__dirname, '/public/test.html'));
});

var port = process.env.PORT || 1337;
var httpServer = require('http').createServer(app);
httpServer.listen(port, function () {
    console.log('parse-server-example running on port ' + port + '.');
});

ParseServer.createLiveQueryServer(httpServer);

/*eslint-enable no-unused-vars*/