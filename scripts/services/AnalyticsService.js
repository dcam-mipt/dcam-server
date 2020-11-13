/*eslint-disable*/
var Parse = require('parse/node')
var config = require('../../config')
var moment = require('moment')
var cron = require('node-cron');
var moment = require('moment-timezone')
var fs = require(`fs`)
var createCsvWriter = require('csv-writer').createObjectCsvWriter;

var Mailer = require(`../MailAPI`)

Parse.initialize(config.PARSE_APP_ID, config.PARSE_JS_KEY, config.PARSE_MASTER_KEY);
Parse.serverURL = config.PARSE_SERVER_URL
Parse.User.enableUnsafeCurrentUser()

let randomId = () => Math.random().toString(36).replace(/^[$A-Z_][0-9A-Z_$]*$/i, '').substr(2, 10).split(``).map(i => Math.random() > 0.5 ? i.toUpperCase() : i).join(``);

let sendBookkeeping = async () => {
    let transactions = await new Parse.Query(`Transactions`).limit(1000000).find()
    transactions = transactions.filter(i => +moment(i.get(`createdAt`)) >= +moment().add(-1, `month`).startOf(`month`) && +moment(i.get(`createdAt`)) <= +moment().add(-1, `month`).endOf(`month`))
    transactions = transactions.filter(i => i.get(`from`) === `yandex`)

    let laundry = await new Parse.Query(`Laundry`).limit(10000000).find()
    laundry = laundry.filter(i => +moment(i.get(`createdAt`)) >= +moment().add(-1, `month`).startOf(`month`) && +moment(i.get(`createdAt`)) <= +moment().add(-1, `month`).endOf(`month`))

    var csvWriter = createCsvWriter({
        path: 'out.csv',
        header: [
            { id: 'label', title: 'Label' },
            { id: 'value', title: 'Value' },
        ]
    });

    var data = [
        {
            label: 'Month',
            value: `${moment().add(-1, `month`).format(`MMMM`)}`,
        },
        {
            label: 'Monthly profit (RUB)',
            value: `${Math.round(transactions.map(i => i.get(`recived`)).reduce((a, b) => a + b))}`,
        },
        {
            label: 'Salary (RUB)',
            value: `${Math.max(Math.round(transactions.map(i => i.get(`recived`)).reduce((a, b) => a + b) * 0.25), 4000)}`,
        },
        {
            label: 'Number of purchases',
            value: `${laundry.length}`,
        },
    ];

    let washers = await new Parse.Query(`Machines`).limit(1000000).find()
    washers.forEach((a, b) => { data = [...data, { label: `Washer #${b + 1}`, value: `${laundry.filter(i => i.get(`machine_id`) === a.id).length}`, }] })

    csvWriter.writeRecords(data).then(() => console.log(`- - - > > > The ${moment().add(-1, `month`).format(`MMMM`)} CSV file was written successfully`));

    let mail_list = [
        `beldiy.dp@phystech.edu`,
        `tselinko.as@phystech.edu`,
    ]
    mail_list.forEach(async (i) => { await Mailer.sendEmail({ email: i, subject: `Laundry Bookkeeping`, html: `DCAM 💰`, files: [{ path: `out.csv`, name: `laundry-${moment().add(-1, `month`).format(`MMMM-YYYY`)}.csv`, type: `text/csv` }] }) })
}

module.exports.AnalyticsService = async (server) => {

    server.get(`/laundry/get-from-date/:date`, async (request, response, next) => {
        if (moment(request.params.date, `YYYY-MM-DD`).isValid()) {
            let id = randomId()
            let requested_laundry = (await new Parse.Query(`Laundry`).limit(1000000000).find()).filter(i => +i.get(`timestamp`) >= +moment(request.params.date, `YYYY-MM-DD`)).map(i => ({ user_id: i.get(`user_id`), date: moment(i.get(`timestamp`)).tz(`Europe/Moscow`).format(`YYYY-MM-DD HH:mm`) }))
            let new_ids = requested_laundry.map(i => i.user_id).filter((a, b, self) => self.indexOf(a) === b).map(i => ({ old: i, new: randomId() }))
            requested_laundry = requested_laundry.map(i => ({ ...i, user_id: new_ids.filter(j => j.old === i.user_id)[0].new }))
            var csvWriter = createCsvWriter({
                path: `${id}.csv`,
                header: [{ id: 'user_id', title: 'User ID' }, { id: 'date', title: 'Date' },]
            });
            csvWriter.writeRecords(requested_laundry)
                .then(() => {
                    // response.send(requested_laundry)
                    response.writeHead(200, {
                        "Content-Type": `application/csv; charset=utf-8`,
                        "Content-Disposition": `attachment;filename="laundry_from_${moment(request.params.date).format(`YYYY_MM_DD`)}.csv"`,
                        "Cache-Control": `max-age=0`,
                    });
                    fs.readFile(`${id}.csv`, (err, data) => {
                        response.end(data);
                        next()
                        fs.unlink(`${id}.csv`, (err) => { if (err) throw err; });
                    });
                });
        } else {
            response.send({ error: `invalid date format` })
        }
    })

}
/*eslint-enable*/