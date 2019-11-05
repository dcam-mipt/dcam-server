var MailAPI = require('./MailAPI')
MailAPI.sendEmail({ email: 'akhiyarov.fr@phystech.edu', subject: `привет`, html: `привет` })
    .then((d) => { console.log(d) })
    .catch((d) => { console.log(d) })