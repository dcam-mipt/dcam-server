/*eslint-disable no-unused-vars*/
const axios = require(`axios`)
const Telegraf = require('telegraf')
const config = require('./config')
const Telegram = require('telegraf/telegram')
const Parse = require(`parse/node`)
const moment = require('moment-timezone')

const telegram = new Telegram(config.TELEGRAM_TOKEN)
const bot = new Telegraf(config.TELEGRAM_TOKEN)
Parse.initialize(config.PARSE_APP_ID, config.PARSE_JS_KEY, config.PARSE_MASTER_KEY);
Parse.serverURL = config.PARSE_SERVER_URL

let openClient = () => {
    let client = new Parse.LiveQueryClient({
        applicationId: config.PARSE_APP_ID,
        serverURL: config.PARSE_WS_URL,
        javascriptKey: config.PARSE_JS_KEY,
        masterKey: config.PARSE_MASTER_KEY
    });
    client.open()
    // error is here
    return client
}
let client = openClient()
let subscribe = (className, method, action) => {
    client.subscribe(new Parse.Query(className)).on(method, (object) => { action(object) })
}

let auth_command = () => {
    let auth_mode = false
    bot.command('auth', (ctx) => {
        auth_mode = true
        ctx.reply(`Введите вашу почту (на домене @phystech.edu)`)
        bot.on(`text`, (mail_answer) => {
            if (auth_mode) {
                let mail = mail_answer.update.message.text
                mail.indexOf(`@`) && axios.get(`http://dcam.pro/api/auth/create_verificatoin_pass/${mail}/${ctx.update.message.from.id}/${ctx.update.message.from.username}`)
                    .then((d) => {
                        switch (d.data) {
                            case `already connected`: ctx.reply(`Аккаунт с этой почтой уже связан с telegram. Если это Ваш аккаунт - нажмите "забыть этот аккаунт" в профиле на сайте, и повторите попытку`); break;
                            case `wrong email`: ctx.reply(`Не существует пользователя с такой почтой`); break;
                            default: ctx.reply(`🔗 Откройте окно Вашего профиля в личном кабинете и введите этот код - ${d.data}. Не сообщайте его никому. Срок действия кода подтверждения - 60 секунд.`)
                        }
                        auth_mode = false
                    })
            }
        })
    })
}

auth_command()

let days_of_week_short = [`пн`, `вт`, `ср`, `чт`, `пт`, `сб`, `вс`]

telegram.sendMessage(227992175, `deployed.`)
subscribe(`Laundry`, `create`, async (laundry) => {
    let user = await new Parse.Query(`User`).equalTo(`objectId`, laundry.get(`user_id`)).first()
    if (user.get(`telegram`)) {
        let machines = await new Parse.Query(`Machines`).find()
        let balance = await new Parse.Query(`Balance`).equalTo(`user_id`, user.id).first()
        telegram.sendMessage(user.get(`telegram`).id, `🧺 Стирка куплена\nДата: ${days_of_week_short[moment(+laundry.get(`timestamp`)).tz(`Europe/Moscow`).isoWeekday()]} ${moment(+laundry.get(`timestamp`)).tz(`Europe/Moscow`).format(`DD.MM.YY`)}\nВремя: ${moment(+laundry.get(`timestamp`)).tz(`Europe/Moscow`).format(`HH:mm`)}\nМашинка: ${machines.map(i => i.id).indexOf(laundry.get(`machine_id`)) + 1}\nЦена: ${laundry.get(`book_cost`)}р`)
    }
})

subscribe(`Laundry`, `delete`, async (laundry) => {
    let user = await new Parse.Query(`User`).equalTo(`objectId`, laundry.get(`user_id`)).first()
    if (user.get(`telegram`)) {
        let machines = await new Parse.Query(`Machines`).find()
        telegram.sendMessage(user.get(`telegram`).id, `🧺 Стирка удалена\nДата: ${days_of_week_short[moment(+laundry.get(`timestamp`)).tz(`Europe/Moscow`).isoWeekday()]} ${moment(+laundry.get(`timestamp`)).tz(`Europe/Moscow`).format(`DD.MM.YY`)}\nВремя: ${moment(+laundry.get(`timestamp`)).tz(`Europe/Moscow`).format(`HH:mm`)}\nМашинка: ${machines.map(i => i.id).indexOf(laundry.get(`machine_id`)) + 1}\nЦена: ${laundry.get(`book_cost`)}р`)
    }
})

subscribe(`Balance`, `update`, async(balance) => {
    let user = await new Parse.Query(`User`).equalTo(`objectId`, balance.get(`user_id`)).first()
    if (user.get(`telegram`)) {
        telegram.sendMessage(user.get(`telegram`).id, `💳 Новыйы баланс: ${balance.get(`money`)}р`)
    }
})

let create_notifications_queue = async () => {
    let notifications = await new Parse.Query(`Notifications`).equalTo(`status`, `delayed`).greaterThan(`delivery_timestamp`, +moment().tz(`Europe/Moscow`))
    console.log(notifications.map(i => moment(i.get(`delivery_timestamp`)).format(`DD.MM.YY HH:mm`)));
}

create_notifications_queue()

bot.start((ctx) => ctx.reply('Добро пожаловать!'))
bot.launch()
/*eslint-enable no-unused-vars*/