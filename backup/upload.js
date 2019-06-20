/*eslint-disable no-unused-vars*/
var exec = require('child_process').exec;
var mime = require('mime');
var moment = require(`moment`)

let drive = () => {
    const fs = require('fs');
    const readline = require('readline');
    const { google } = require('googleapis');

    const SCOPES = ['https://www.googleapis.com/auth/spreadsheets',
        "https://www.googleapis.com/auth/drive.file",
        "https://www.googleapis.com/auth/drive"]
    const TOKEN_PATH = 'token.json';

    fs.readFile('credentials.json', (err, content) => {
        if (err) return console.log('Error loading client secret file:', err);
        authorize(JSON.parse(content), create_backup);
    });

    function authorize(credentials, callback) {
        const { client_secret, client_id, redirect_uris } = credentials.installed;
        const oAuth2Client = new google.auth.OAuth2(
            client_id, client_secret, redirect_uris[0]);

        fs.readFile(TOKEN_PATH, (err, token) => {
            if (err) return getAccessToken(oAuth2Client, callback);
            oAuth2Client.setCredentials(JSON.parse(token));
            callback(oAuth2Client);
        });
    }

    function getAccessToken(oAuth2Client, callback) {
        const authUrl = oAuth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: SCOPES,
        });
        console.log('Authorize this app by visiting this url:', authUrl);
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        });
        rl.question('Enter the code from that page here: ', (code) => {
            rl.close();
            oAuth2Client.getToken(code, (err, token) => {
                if (err) return console.error('Error retrieving access token', err);
                oAuth2Client.setCredentials(token);
                fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
                    if (err) return console.error(err);
                    console.log('Token stored to', TOKEN_PATH);
                });
                callback(oAuth2Client);
            });
        });
    }

    function create_backup(auth) {

        exec("mongodump && zip -r -m dump.zip dump", () => {
            const drive = google.drive({ version: 'v3', auth });
            var fileMetadata = {
                'name': `dump_${+moment()}}.zip`,
                parents: [`10s-5g5AScFrjU5yQ0nhad9BtKhg1ELE2`]
            };
            var media = {
                mimeType: mime.getType(`dump.zip`),
                body: fs.createReadStream('dump.zip')
            };
            drive.files.create({
                resource: fileMetadata,
                media: media,
                fields: 'id'
            }, function (err, file) {
                if (err) {
                    console.error(err);
                } else {
                    console.log('File Id: ', file.id);
                }
            });
        });

    }

}

drive()
/*eslint-enable no-unused-vars*/