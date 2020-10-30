/*eslint-disable*/
var Parse = require('parse/node')
var config = require('../../config')
var moment = require('moment')
var cron = require('node-cron');
var createCsvWriter = require('csv-writer').createObjectCsvWriter;

var Mailer = require(`../MailAPI`)

Parse.initialize(config.PARSE_APP_ID, config.PARSE_JS_KEY, config.PARSE_MASTER_KEY);
Parse.serverURL = config.PARSE_SERVER_URL
Parse.User.enableUnsafeCurrentUser()

let sendBookkeeping =  async () => {
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
            value: `${Math.round(transactions.map(i => i.get(`recived`)).reduce((a, b) => a + b) * 0.25)}`,
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

module.exports.BookkeepingService = async (server) => {
    cron.schedule('0 0 1 * *', () => { sendBookkeeping() });
}
/*eslint-enable*/