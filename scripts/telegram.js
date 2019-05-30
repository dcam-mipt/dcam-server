/*eslint-disable no-unused-vars*/
const axios = require(`axios`)
const Telegraf = require('telegraf')
const config = require('./config')
const Telegram = require('telegraf/telegram')
const Parse = require('parse/node')
const log = require('./rest')
log(`< < < log > > >`)

const telegram = new Telegram(config.TELEGRAM_TOKEN)
const bot = new Telegraf(config.TELEGRAM_TOKEN)
Parse.initialize(config.PARSE_APP_ID, config.PARSE_JS_KEY, config.PARSE_MASTER_KEY);
Parse.serverURL = config.PARSE_SERVER_URL

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

bot.start((ctx) => ctx.reply('Добро пожаловать!'))
bot.launch()
/*eslint-enable no-unused-vars*/