/*eslint-disable no-unused-vars*/
const emailjs = require('emailjs/email');
var config = require('../config')

const EmailAPI = module.exports = {

    getServer() {
        if (this.serverInstance == undefined) {
            this.serverInstance = emailjs.server.connect({
                user: config.YANDEX_SMTP_MAIL,
                password: config.YANDEX_SMTP_PASSWORD,
                ssl: true,
                host: config.YANDEX_SMTP_ADDRESS,
                port: config.YANDEX_SMTP_PORT
            });
        }
        return this.serverInstance;
    },

    sendEmail({ email, subject, html, files = [] }) {
        return new Promise((resolve, reject) => {
            let server = this.getServer();
            server.send({
                from: config.YANDEX_SMTP_MAIL,
                to: `${email}`,
                subject: subject,
                attachment:
                    [
                        { data: `<html>${html}</html>`, alternative: true },
                        ...files.map(i => ({ path: i.path + ``, type: i.type + ``, name: (i.name || i.path) + `` }))
                    ]
            }, (err, message) => {
                if (err != undefined) {
                    return reject(err);
                }
                resolve(message);
            });
        });
    }

}
/*eslint-enable no-unused-vars*/

// /*eslint-disable no-unused-vars*/
// const nodemailer = require("nodemailer");
// var config = require('../config')

// const EmailAPI = module.exports = {
//     async sendEmail({ email, subject, html }) {

//         var transporter = nodemailer.createTransport({
//             service: config.YANDEX_SMTP_ADDRESS,
//             auth: {
//                 user: config.YANDEX_SMTP_PASSWORD,
//                 pass: config.YANDEX_SMTP_MAIL,
//             },
//             // service: 'gmail',
//             // auth: {
//             //     user: config.GOOGLE_MAIL,
//             //     pass: config.GOOGLE_PASSWORD,
//             // },
//         });

//         let info = await transporter.sendMail({
//             // from: config.GOOGLE_MAIL,
//             from: config.YANDEX_SMTP_MAIL,
//             to: email,
//             subject: subject,
//             text: html,
//             html: `${html}`,
//         });
//         console.log(`> > > Email with text "${html}" send to ${email}`);
//     }


// }
// /*eslint-enable no-unused-vars*/