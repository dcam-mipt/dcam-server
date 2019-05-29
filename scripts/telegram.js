/*eslint-disable no-unused-vars*/
const axios = require(`axios`)
const Telegraf = require('telegraf')
const config = require('./config')

const bot = new Telegraf(config.TELEGRAM_TOKEN)
bot.start((ctx) => ctx.reply('Добро пожаловать!'))
bot.command('auth', (ctx) => {
    let from_id = ctx.update.message.from.id
    ctx.reply(`Ваша почта на домене @phystech.edu:`)
    bot.on(`text`, (mail_answer) => {
        axios.get(`http://dcam.pro/api/auth/create_verificatoin_pass/${mail_answer.update.message.text}/${from_id}`)
            .then((d) => { ctx.reply(`Откройте окно Вашего профиля в личном кабинете и введите этот код - ${d.data}. Не сообщайте его никому. Срок действия кода подтверждения - 60 секунд.`) })
            .catch((d) => { console.log(d) })
    })
})
bot.launch()
/*eslint-enable no-unused-vars*/