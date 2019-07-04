/*eslint-disable no-unused-vars*/
let moment = require(`moment-timezone`)
let exec = require('child_process').exec;

setTimeout(() => {
    setInterval(() => {
        console.log(`need backup`);
    }, 1000)
}, +moment().startOf(`minute`).add(1, `minute`).tz(`Europe/Moscow`) - +moment().tz(`Europe/Moscow`))

exec("node upload.js", () => {})
/*eslint-enable no-unused-vars*/