/*eslint-disable no-unused-vars*/
let moment = require(`moment-timezone`)
let exec = require('child_process').exec;

let interval_in_hours = 1 / (60 * 4)

// setTimeout(() => {
setInterval(() => {
    console.log(`> > >`);
    exec("node upload.js", () => { console.log(`done`); })
}, 60 * 60 * 1000 * interval_in_hours)
// }, +moment().startOf(`minute`).add(1, `minute`).tz(`Europe/Moscow`) - +moment().tz(`Europe/Moscow`))
/*eslint-enable no-unused-vars*/