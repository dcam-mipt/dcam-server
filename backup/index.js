/*eslint-disable no-unused-vars*/
let moment = require(`moment-timezone`)
let exec = require('child_process').exec;

let interval_in_hours = 1

setTimeout(() => {
    setInterval(() => {
        console.log(`> > >`);
        exec("node ~/backup/upload.js", () => { console.log(`done`); })
    }, 60 * 60 * 1000 * interval_in_hours)
}, +moment().startOf(`hour`).add(1, `hour`).tz(`Europe/Moscow`) - +moment().tz(`Europe/Moscow`))
/*eslint-enable no-unused-vars*/