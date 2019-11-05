var MailAPI = require('./MailAPI')
MailAPI.sendEmail({ email: 'beldiy.dp@phystech.edu', subject: `test`, html: `test` })
    .then((d) => { console.log(d) })
    .catch((d) => { console.log(d) })