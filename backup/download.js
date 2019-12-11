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
        authorize(JSON.parse(content), download);
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

    function download(auth) {

        const drive = google.drive({ version: 'v3', auth });
        drive.files.list({
            pageSize: 10,
            fields: 'nextPageToken, files(id, name, parents)',
            parents: [`10s-5g5AScFrjU5yQ0nhad9BtKhg1ELE2`]
        }, (err, res) => {
            if (err) return console.log('The API returned an error: ' + err);
            const files = res.data.files;
            if (files.length) {
                let q = 0
                console.log(files);
                // let fileId = files.filter(i => i.name.indexOf(`dump`) > -1).sort((b, a) => +a.name.split(`.`)[0].split(`_`)[1] - +b.name.split(`.`)[0].split(`_`)[1])[q].id
                // console.log(files.filter(i => i.name.indexOf(`dump`) > -1).sort((b, a) => +a.name.split(`.`)[0].split(`_`)[1] - +b.name.split(`.`)[0].split(`_`)[1]).map((i, index) => i.name.indexOf(`dump`) > -1 ? moment(+i.name.split(`_`)[1].split(`.`)[0]).format(`DD.MM.YY HH:mm`) : i.name)[q]);
                // var dest = fs.createWriteStream('dump.zip');
                // drive.files.get({ fileId: fileId, alt: 'media' }, { responseType: 'stream' },
                //     function (err, res) {
                //         res.data
                //             .on('end', () => {
                //                 console.log('> > > backup downloaded');
                //                 exec(`./restore.sh`, () => { console.log(`> > > backup restored`) })
                //             })
                //             .on('error', err => {
                //                 console.log('Error', err);
                //             })
                //             .pipe(dest);
                //     }
                // );


            } else {
                console.log('No files found.');
            }
        });

    }

}

drive()
/*eslint-enable no-unused-vars*/