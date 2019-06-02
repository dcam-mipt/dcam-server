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
            console.log(`< < <`, mail_answer.update.message.from.id, mail_answer.update.message.from.username);
            if (auth_mode) {
                let mail = mail_answer.update.message.text
                mail.indexOf(`@`) && axios.get(`http://dcam.pro/api/auth/create_verificatoin_pass/${mail}/${mail_answer.update.message.from.id}/${mail_answer.update.message.from.username}`)
                    .then((d) => {
                        switch (d.data) {
                            case `already connected`: mail_answer.reply(`Аккаунт с этой почтой уже связан с telegram. Если это Ваш аккаунт - нажмите "забыть этот аккаунт" в профиле на сайте, и повторите попытку`); break;
                            case `wrong email`: mail_answer.reply(`Не существует пользователя с такой почтой`); break;
                            default: mail_answer.reply(`🔗 Откройте окно Вашего профиля в личном кабинете и введите этот код - ${d.data}. Не сообщайте его никому. Срок действия кода подтверждения - 60 секунд.`)
                        }
                        auth_mode = false
                    })
            }
        })
    })
}

// bot.on(`text`, (message) => {
//     telegram.sendMessage(227992175, `${message.update.message.from.username}\n\n${message.update.message.text}`)
// })

auth_command()

let days_of_week_short = [`пн`, `вт`, `ср`, `чт`, `пт`, `сб`, `вс`]

let create_notification = async (user_id, message, delivery_timestamp) => await new Parse.Object(`Notifications`)
    .set(`delivery_timestamp`, delivery_timestamp ? delivery_timestamp : +moment().tz(`Europe/Moscow`))
    .set(`status`, `delayed`)
    .set(`user_id`, user_id)
    .set(`message`, message)
    .save()

telegram.sendMessage(227992175, `deployed.`)
subscribe(`Laundry`, `create`, async (laundry) => {
    let user = await new Parse.Query(`User`).equalTo(`objectId`, laundry.get(`user_id`)).first()
    if (user.get(`telegram`)) {
        let machines = await new Parse.Query(`Machines`).find()
        telegram.sendMessage(user.get(`telegram`).id, `🧺 Стирка куплена\nДата: ${days_of_week_short[moment(+laundry.get(`timestamp`)).tz(`Europe/Moscow`).isoWeekday() - 1]} ${moment(+laundry.get(`timestamp`)).tz(`Europe/Moscow`).format(`DD.MM.YY`)}\nВремя: ${moment(+laundry.get(`timestamp`)).tz(`Europe/Moscow`).format(`HH:mm`)}\nМашинка: ${machines.map(i => i.id).indexOf(laundry.get(`machine_id`)) + 1}\nЦена: ${laundry.get(`book_cost`)}р`)
    }
})

subscribe(`Laundry`, `delete`, async (laundry) => {
    let user = await new Parse.Query(`User`).equalTo(`objectId`, laundry.get(`user_id`)).first()
    if (user.get(`telegram`)) {
        let machines = await new Parse.Query(`Machines`).find()
        telegram.sendMessage(user.get(`telegram`).id, `🧺 Стирка удалена\nДата: ${days_of_week_short[moment(+laundry.get(`timestamp`)).tz(`Europe/Moscow`).isoWeekday() - 1]} ${moment(+laundry.get(`timestamp`)).tz(`Europe/Moscow`).format(`DD.MM.YY`)}\nВремя: ${moment(+laundry.get(`timestamp`)).tz(`Europe/Moscow`).format(`HH:mm`)}\nМашинка: ${machines.map(i => i.id).indexOf(laundry.get(`machine_id`)) + 1}\nЦена: ${laundry.get(`book_cost`)}р`)
    }
})

subscribe(`Balance`, `update`, async (balance) => {
    let user = await new Parse.Query(`User`).equalTo(`objectId`, balance.get(`user_id`)).first()
    await create_notification(user.id, `💳 Новыйы баланс: ${balance.get(`money`)}р`)
})

let create_notifications_queue = async () => {
    let notifications = await new Parse.Query(`Notifications`).equalTo(`status`, `delayed`).find()
    notifications.map(async notification => {
        let user = await new Parse.Query(`User`).equalTo(`objectId`, notification.get(`user_id`)).first()
        let delay = +moment(notification.get(`delivery_timestamp`)).tz(`Europe/Moscow`) - +moment().tz(`Europe/Moscow`)
        if (user.get(`telegram`)) {
            setTimeout(async () => {
                telegram.sendMessage(user.get(`telegram`).id, notification.get(`message`))
                await notification.set(`status`, `sent`).save()
            }, delay > 0 ? delay : 0)
        }
        return delay
    })
}

subscribe(`Notifications`, `create`, async (notification) => {
    let user = await new Parse.Query(`User`).equalTo(`objectId`, notification.get(`user_id`)).first()
    let delay = +moment(notification.get(`delivery_timestamp`)).tz(`Europe/Moscow`) - +moment().tz(`Europe/Moscow`)
    if (user.get(`telegram`)) {
        setTimeout(async () => {
            telegram.sendMessage(user.get(`telegram`).id, notification.get(`message`))
            await notification.set(`status`, `sent`).save()
        }, delay > 0 ? delay : 0)
    }
})

create_notifications_queue()

bot.start((ctx) => ctx.reply('Добро пожаловать!\n Отправьте /auth'))
bot.launch()
/*eslint-enable no-unused-vars*/