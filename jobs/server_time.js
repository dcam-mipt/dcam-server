var moment = require(`moment-timezone`)
var Parse = require(`parse/node`)
var config = require('./config')

Parse.initialize(config.PARSE_APP_ID, config.PARSE_JS_KEY, config.PARSE_MASTER_KEY);
Parse.serverURL = config.PARSE_SERVER_URL

let init_laundry_cost = () => {
    let q = new Parse.Query(`Constants`)
    q.equalTo(`name`, `laundry_cost`)
    q.first({}, { useMasterKey: true })
        .then((d) => {
            if (d === undefined) {
                const Laundry_cost = Parse.Object.extend(`Constants`);
                const laundry_cost = new Laundry_cost();
                laundry_cost.set(`name`, `laundry_cost`);
                laundry_cost.set(`value`, 25 + "")
                laundry_cost.save({}, { useMasterKey: true })
                    .then((d) => { console.log(`laundry cost is created`, d) })
                    .catch((d) => { console.log(d) })
            }
        })
        .catch((d) => { console.log(d) })
}

let deal = () => {
    let q = new Parse.Query(`Constants`)
    q.equalTo(`name`, `timestamp`)
    q.first({}, { useMasterKey: true })
        .then((d) => {
            d.set(`value`, +moment().tz(`Europe/Moscow`) + "")
            d.save({}, { useMasterKey: true })
                .then((d) => { console.log(d) })
                .catch((d) => { console.log(d) })
        })
        .catch((d) => {
            const Time_const = Parse.Object.extend(`Constants`);
            const time_const = new Time_const();
            time_const.set(`name`, `timestamp`);
            time_const.set(`value`, +moment().tz(`Europe/Moscow`) + "")
            time_const.save({}, { useMasterKey: true })
                .then((d) => {
                    console.log(`set server time:`, d.get(`timestamp`));
                    deal()
                })
                .catch((d) => { console.log(d) })
        })
}

init_laundry_cost();
console.log(`now is`, moment().tz(`Europe/Moscow`).format(`HH:mm:ss`))
let left = 60 - +moment().tz(`Europe/Moscow`).format(`ss`)
console.log(`timer will start after`, left, `seconds`)
setTimeout(() => {
    deal()
    setInterval(() => {
        deal()
    }, 60 * 1000)
}, left * 1000)