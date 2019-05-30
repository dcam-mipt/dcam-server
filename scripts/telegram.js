/*eslint-disable no-unused-vars*/
const axios = require(`axios`)
const Telegraf = require('telegraf')
const config = require('./config')
const Telegram = require('telegraf/telegram')

const telegram = new Telegram(config.TELEGRAM_TOKEN)
const bot = new Telegraf(config.TELEGRAM_TOKEN)
bot.start((ctx) => ctx.reply('Добро пожаловать!'))
bot.command('auth', (ctx) => {
    ctx.reply(`Введите вашу почту (на домене @phystech.edu)`)
    bot.on(`text`, (mail_answer) => {
        let mail = mail_answer.update.message.text
        mail.indexOf(`@`) && axios.get(`http://dcam.pro/api/auth/create_verificatoin_pass/${mail}/${ctx.update.message.from.id}/${ctx.update.message.from.username}`)
            .then((d) => { ctx.reply(`Откройте окно Вашего профиля в личном кабинете и введите этот код - ${d.data}. Не сообщайте его никому. Срок действия кода подтверждения - 60 секунд.`) })
            .catch((d) => {
                if (d === `wrong email`) {
                    ctx.reply(`Не существует пользователя с такой почтой`)
                } else {
                    ctx.reply(`Произошла ошибка, не ведаю, что происходит`)
                }
            })
    }
})
bot.launch()
/*eslint-enable no-unused-vars*/