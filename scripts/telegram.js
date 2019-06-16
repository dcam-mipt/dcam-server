/*eslint-disable no-unused-vars*/
const axios = require(`axios`)
const Telegraf = require('telegraf')
const config = require('./config')
const Telegram = require('telegraf/telegram')
const Markup = require('telegraf/markup')
const Extra = require('telegraf/extra')
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
    bot.command('auth', async (ctx) => {
        auth_mode = true
        let users = await new Parse.Query(`User`).limit(1000000).find()
        let current_user = users.filter(i => i.get(`telegram`) !== undefined && i.get(`telegram`) !== null).map(i => { return { telegram_id: i.get(`telegram`).id, mail: i.get(`username`) } }).filter(i => +i.telegram_id === +ctx.update.message.from.id)[0]
        if (current_user) {
            ctx.reply(`Этот бот уже привязан к профилю c почтой ${current_user.mail}`)
        } else {
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
        }
    })
}

auth_command()

let days_of_week_short = [`пн`, `вт`, `ср`, `чт`, `пт`, `сб`, `вс`]

telegram.sendMessage(227992175, `deployed.`)

let create_notification = async (user_id, message, delivery_timestamp) => await new Parse.Object(`Notifications`)
    .set(`delivery_timestamp`, delivery_timestamp ? delivery_timestamp : +moment().tz(`Europe/Moscow`))
    .set(`status`, `delayed`)
    .set(`user_id`, user_id)
    .set(`message`, message)
    .save()

let create_notifications_queue = async () => {
    let notifications = await new Parse.Query(`Notifications`).equalTo(`status`, `delayed`).find()
    console.log(`notifications queue`);
    notifications.map(async notification => {
        let user = await new Parse.Query(`User`).equalTo(`objectId`, notification.get(`user_id`)).first()
        let delay = +moment(notification.get(`delivery_timestamp`)).tz(`Europe/Moscow`) - +moment().tz(`Europe/Moscow`)
        setTimeout(async () => {
            user.get(`telegram`) && telegram.sendMessage(user.get(`telegram`).id, notification.get(`message`))
            await notification.set(`status`, `sent`).save()
        }, delay > 0 ? delay : 0)
        console.log(moment(notification.get(`delivery_timestamp`)).tz(`Europe/Moscow`).format(`DD.MM.YY HH:mm`), `\t`, user.get(`username`).split(`@`)[0].split(`.`)[0]);
        return delay
    })
}

create_notifications_queue()

subscribe(`Laundry`, `create`, async (laundry) => {
    let user = await new Parse.Query(`User`).equalTo(`objectId`, laundry.get(`user_id`)).first()
    if (user.get(`telegram`)) {
        let machines = await new Parse.Query(`Machines`).find()
        telegram.sendMessage(user.get(`telegram`).id, `🧺 Стирка куплена\nДата: ${days_of_week_short[moment(+laundry.get(`timestamp`)).tz(`Europe/Moscow`).isoWeekday() - 1]} ${moment(+laundry.get(`timestamp`)).tz(`Europe/Moscow`).format(`DD.MM.YY`)}\nВремя: ${moment(+laundry.get(`timestamp`)).tz(`Europe/Moscow`).format(`HH:mm`)}\nМашинка: ${machines.map(i => i.id).indexOf(laundry.get(`machine_id`)) + 1}\nЦена: ${laundry.get(`book_cost`)}р`)
    }
})

subscribe(`Laundry`, `delete`, async (laundry) => {
    let machines = await new Parse.Query(`Machines`).find()
    return await create_notification(laundry.get(`user_id`), `🧺 Стирка удалена\nДата: ${days_of_week_short[moment(+laundry.get(`timestamp`)).tz(`Europe/Moscow`).isoWeekday() - 1]} ${moment(+laundry.get(`timestamp`)).tz(`Europe/Moscow`).format(`DD.MM.YY`)}\nВремя: ${moment(+laundry.get(`timestamp`)).tz(`Europe/Moscow`).format(`HH:mm`)}\nМашинка: ${machines.map(i => i.id).indexOf(laundry.get(`machine_id`)) + 1}\nЦена: ${laundry.get(`book_cost`)}р`)
})

subscribe(`Balance`, `update`, async (balance) => {
    return await create_notification(balance.get(`user_id`), `💳 Новыйы баланс: ${balance.get(`money`)}р`)
})

subscribe(`Notifications`, `create`, async (notification) => {
    let user = await new Parse.Query(`User`).equalTo(`objectId`, notification.get(`user_id`)).first()
    let delay = +moment(notification.get(`delivery_timestamp`)).tz(`Europe/Moscow`) - +moment().tz(`Europe/Moscow`)
    setTimeout(async () => {
        user.get(`telegram`) && telegram.sendMessage(user.get(`telegram`).id, notification.get(`message`))
        await notification.set(`status`, `sent`).save()
    }, delay > 0 ? delay : 0)
    console.log(`new notification:`, {
        to: user.get(`username`).split(`@`)[0].split(`.`)[0],
        message: notification.get(`message`)
    });
})

bot.start((ctx) => ctx.reply('Добро пожаловать!\n Отправьте /help, чтоб получить список команд'))
bot.command('help', (ctx) => {
    ctx.reply(`Вот список команд:
    /auth - авторизация
    /help - помощь в работе с сервисом`)
})

// > > >

bot.use(Telegraf.log())

bot.command('onetime', ({ reply }) =>
    reply('One time keyboard', Markup
        .keyboard(['/simple', '/inline', '/pyramid'])
        .oneTime()
        .resize()
        .extra()
    )
)

bot.command('custom', ({ reply }) => {
    return reply('Custom buttons keyboard', Markup
        .keyboard([
            ['🔍 Search', '😎 Popular'], // Row1 with 2 buttons
            ['☸ Setting', '📞 Feedback'], // Row2 with 2 buttons
            ['📢 Ads', '⭐️ Rate us', '👥 Share'] // Row3 with 3 buttons
        ])
        .oneTime()
        .resize()
        .extra()
    )
})

bot.hears('🔍 Search', ctx => ctx.reply('Yay!'))
bot.hears('📢 Ads', ctx => ctx.reply('Free hugs. Call now!'))

bot.command('special', (ctx) => {
    return ctx.reply('Special buttons keyboard', Extra.markup((markup) => {
        return markup.resize()
            .keyboard([
                markup.contactRequestButton('Send contact'),
                markup.locationRequestButton('Send location')
            ])
    }))
})

bot.command('pyramid', (ctx) => {
    return ctx.reply('Keyboard wrap', Extra.markup(
        Markup.keyboard(['one', 'two', 'three', 'four', 'five', 'six'], {
            wrap: (btn, index, currentRow) => currentRow.length >= (index + 1) / 2
        })
    ))
})

bot.command('simple', (ctx) => {
    return ctx.replyWithHTML('<b>Coke</b> or <i>Pepsi?</i>', Extra.markup(
        Markup.keyboard(['Coke', 'Pepsi'])
    ))
})

bot.command('inline', (ctx) => {
    return ctx.reply('<b>Coke</b> or <i>Pepsi?</i>', Extra.HTML().markup((m) =>
        m.inlineKeyboard([
            m.callbackButton('Coke', 'Coke'),
            m.callbackButton('Pepsi', 'Pepsi')
        ])))
})

bot.command('random', (ctx) => {
    return ctx.reply('random example',
        Markup.inlineKeyboard([
            Markup.callbackButton('Coke', 'Coke'),
            Markup.callbackButton('Dr Pepper', 'Dr Pepper', Math.random() > 0.5),
            Markup.callbackButton('Pepsi', 'Pepsi')
        ]).extra()
    )
})

bot.command('caption', (ctx) => {
    return ctx.replyWithPhoto({ url: 'https://picsum.photos/200/300/?random' },
        Extra.load({ caption: 'Caption' })
            .markdown()
            .markup((m) =>
                m.inlineKeyboard([
                    m.callbackButton('Plain', 'plain'),
                    m.callbackButton('Italic', 'italic')
                ])
            )
    )
})

bot.hears(/\/wrap (\d+)/, (ctx) => {
    return ctx.reply('Keyboard wrap', Extra.markup(
        Markup.keyboard(['one', 'two', 'three', 'four', 'five', 'six'], {
            columns: parseInt(ctx.match[1])
        })
    ))
})

bot.action('Dr Pepper', (ctx, next) => {
    return ctx.reply('👍').then(() => next())
})

bot.action('plain', async (ctx) => {
    ctx.editMessageCaption('Caption', Markup.inlineKeyboard([
        Markup.callbackButton('Plain', 'plain'),
        Markup.callbackButton('Italic', 'italic')
    ]))
})

bot.action('italic', (ctx) => {
    ctx.editMessageCaption('_Caption_', Extra.markdown().markup(Markup.inlineKeyboard([
        Markup.callbackButton('Plain', 'plain'),
        Markup.callbackButton('* Italic *', 'italic')
    ])))
})

bot.action(/.+/, (ctx) => {
    return ctx.answerCbQuery(`Oh, ${ctx.match[0]}! Great choice`)
})

// > > >

bot.launch()
/*eslint-enable no-unused-vars*/