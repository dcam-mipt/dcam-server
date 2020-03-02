var restify = require('restify');
var CookieParser = require('restify-cookies');
var Parse = require('parse/node')
var config = require('../config')
var corsMiddleware = require('restify-cors-middleware');
var moment = require('moment-timezone')
var axios = require(`axios`)
var Mailer = require(`./MailAPI`)

Parse.initialize(config.PARSE_APP_ID, config.PARSE_JS_KEY, config.PARSE_MASTER_KEY);
Parse.serverURL = config.PARSE_SERVER_URL
Parse.User.enableUnsafeCurrentUser()

var server = restify.createServer({ maxParamLength: 500 });
server.use(restify.plugins.bodyParser());
server.use(CookieParser.parse);

var cors = corsMiddleware({
    preflightMaxAge: 5,
    origins: ['*'],
    allowHeaders: ['*'],
    methods: ['GET', 'PUT', 'DELETE', 'POST', 'OPTIONS'],
})
server.pre(cors.preflight)
server.use(cors.actual)
server.use(restify.plugins.queryParser())

server.listen(config.REST_PORT, () => {
    console.log('%s listening at %s', server.name, server.url);
});

let days_of_week_short = [`пн`, `вт`, `ср`, `чт`, `пт`, `сб`, `вс`]

// rest

let writeLog = (message, user) => new Promise((resolve, reject) => {
    var Logs = Parse.Object.extend(`Logs`);
    console.log(message);
    new Logs()
        .set(`message`, message)
        .set(`from`, user)
        .save()
        .then((d) => { resolve(d) })
        .catch((d) => { reject(d) })
})

let updateActivity = (user) => new Promise((resolve, reject) => {
    new Parse.Query(`User`)
        .limit(1000000)
        .equalTo(`objectId`, user.id)
        .first()
        .then((user) => {
            user.set(`last_seen`, +moment().tz(`Europe/Moscow`))
            user.save()
                .then((d) => { resolve(d) })
                .catch((d) => { reject(d) })
        })
        .catch((d) => { reject(d) })
})

let changeBalance = (user, value, author) => new Promise((resolve, reject) => {
    new Parse.Query(`Balance`)
        .equalTo(`user_id`, user)
        .first()
        .then((d) => {
            d.set(`money`, d.get(`money`) + +value)
            d.save()
                .then((d) => {
                    writeLog(`balance: change ${user} to ${d.get(`money`)} (${value} rub)`, author)
                    resolve(d)
                })
                .catch((d) => { reject(d) })
        })
        .catch((d) => { reject(d) })
})

let become = (request) => new Promise((resolve, reject) => {
    let sessionToken = request.headers.authorization
    if (!sessionToken) {
        reject({
            error: `invalid sessoin token`,
            token: sessionToken,
            url: request._url.href,
            headers: request.headers,
            code: 209,
        }, sessionToken)
        return
    }
    Parse.User.become(sessionToken)
        .then((user) => {
            updateActivity(user)
            resolve(user)
        })
        .catch((d) => { reject(d) })
})


let isAdmin = (user) => new Promise(async (resolve, reject) => {
    let equal_roles = await new Parse.Query(`Roles`).equalTo(`user_id`, user.id).equalTo(`role`, `ADMIN`).first()
    if (equal_roles) {
        resolve(true)
    } else {
        reject(false)
    }
})

server.post('/yandex/', async (req, res, next) => {
    console.log(` - - - > > > incoming request:`, req.body.label, req.body.amount, `RUB`)
    let tr = await new Parse.Query(`Transactions`).equalTo(`solid`, req.body.label.split(` `)[1]).find()
    if (tr.length === 0) {
        await new Parse.Object(`Transactions`)
            .set(`to`, req.body.label.split(` `)[0])
            .set(`from`, `yandex`)
            .set(`requested`, +req.body.withdraw_amount)
            .set(`recived`, +req.body.amount)
            .set(`status`, `done`)
            .set(`solid`, req.body.label.split(` `)[1])
            .save()
        let balance = await new Parse.Query(`Balance`).equalTo(`user_id`, req.body.label.split(` `)[0]).first()
        await balance.set(`money`, +balance.get(`money`) + +req.body.withdraw_amount).save()
        let user = await new Parse.Query(`User`).equalTo(`objectId`, req.body.label.split(` `)[0]).first()
        await Mailer.sendEmail({
            email: user.get(`username`),
            subject: `Стиралка`,
            html: `
                <html>
                <div style={{ marginTop: '1vw', }} >👉💳 ${+req.body.withdraw_amount}р</div>
                <div style={{ marginTop: '1vw', }} >Баланс: ${balance.get(`money`)}р</div>
                <div style={{ marginTop: '2vw', }} >Спасибо, что пользуетесь услугами Студсовета ФПМИ!</div>
                </html>
            `
        })
    }
});

let createOneBook = (request, user, group_id, week_number) => new Promise((resolve, reject) => {
    var club_query = Parse.Object.extend(`Club`);
    var club_record = new club_query();
    club_record.set(`user_id`, user.id)
    club_record.set(`location`, request.body.location)
    club_record.set(`start_timestamp`, +moment(request.body.start_timestamp).tz(`Europe/Moscow`).add(week_number, `week`))
    club_record.set(`end_timestamp`, +moment(request.body.end_timestamp).tz(`Europe/Moscow`).add(week_number, `week`))
    club_record.set(`is_regular`, request.body.is_regular)
    club_record.set(`is_allowed`, false)
    club_record.set(`data`, request.body.data)
    club_record.set(`group_id`, group_id)
    club_record.save()
        .then((d) => { console.log(`> > >`); resolve(d) })
        .catch((d) => { reject(d) })
})

// create club book
server.post(`/club/create_book/`, (request, response, next) => {
    let group_id = request.body.is_regular ? Math.random().toString(36).substring(2, 10) : undefined
    become(request)
        .then((user) => {
            let week_number = 0
            let deal = () => {
                createOneBook(request, user, group_id, week_number)
                    .then((d) => {
                        if (+moment(request.body.start_timestamp).tz(`Europe/Moscow`).add(week_number, `week`) < +request.body.data.end_of_repeat) {
                            week_number++
                            deal()
                        }
                    })
                    .catch((d) => { response.send(d); console.error(d) })
            }
            deal()
        })
        .catch((d) => { response.send(d); console.error(d) })
});

server.get(`/laundry/unbook/:book_id`, (request, response, next) => {
    become(request)
        .then((user) => {
            new Parse.Query(`Laundry`)
                .equalTo(`objectId`, request.params.book_id)
                .first()
                .then((book) => {
                    let calc_hours = (timestamp) => +(((+moment(timestamp).tz(`Europe/Moscow`) - +moment().tz(`Europe/Moscow`)) / 3600000 + ``).split(`.`)[0])
                    changeBalance(book.get(`user_id`), calc_hours(+book.get(`timestamp`)) > 2 ? book.get(`book_cost`) : 0, user)
                        .then((new_balance) => {
                            let message = `laundry: unbook (${book.get(`user_id`)}, ${book.get(`machine_id`)}, ${moment(book.get(`timestamp`)).tz(`Europe/Moscow`).format(`DD.MM.YY HH:mm`)})`
                            writeLog(message, user)
                            book.destroy()
                            new Parse.Query(`Notifications`)
                                .equalTo(`objectId`, book.get(`notification_id`))
                                .first()
                                .then((notification) => {
                                    notification.destroy()
                                        .then(async (d) => {
                                            try {
                                                await Mailer.sendEmail({
                                                    email: user.get(`username`),
                                                    subject: `Стиралка`,
                                                    html: `
                                                        <html>
                                                        <title>Стиралка</title>
                                                        <div>Стирка удалена 🧺</div>
                                                        </html>
                                                    `
                                                })
                                            } catch (error) {
                                                console.log(error);
                                            }
                                            response.send(d)
                                        })
                                        .catch((d) => { response.send(d); console.error(d) })
                                })
                                .catch((d) => { response.send(d); console.error(d) })
                        })
                        .catch((d) => { response.send(d); console.error(d) })
                })
                .catch((d) => { response.send(d); console.error(d) })
        })
        .catch((d) => { response.send(d); console.error(d) })
});

server.get(`/laundry/get`, (request, response, next) => {
    new Parse.Query(`User`)
        .limit(1000000)
        .find()
        .then((users) => {
            new Parse.Query(`Laundry`)
                .greaterThanOrEqualTo(`timestamp`, +moment().tz(`Europe/Moscow`).startOf(`isoWeek`))
                .limit(1000000)
                .find()
                .then((d) => {
                    response.send(d.map((i) => {
                        let user = users.filter(u => u.id === i.get(`user_id`))[0]
                        return {
                            machine_id: i.get(`machine_id`),
                            objectId: i.id,
                            timestamp: i.get(`timestamp`),
                            user_id: i.get(`user_id`),
                            email: user ? user.get(`username`) : i.get(`user_id`)
                        }
                    }))
                })
                .catch((d) => { response.send(d); console.error(d) })
        })
        .catch((d) => { response.send(d); console.error(d) })
});

server.get(`/laundry/broke_machine/:machine_id/:timestamp`, (request, response, next) => {
    become(request)
        .then((user) => {
            isAdmin(user)
                .then((role) => {
                    if (role) {
                        let is_before_now = +request.params.timestamp < +moment().tz(`Europe/Moscow`).add(-2, `hour`)
                        new Parse.Query(`Machines`)
                            .equalTo(`objectId`, request.params.machine_id)
                            .first()
                            .then((machine) => {
                                machine.set(`chill_untill`, is_before_now ? null : +request.params.timestamp)
                                machine.set(`is_disabled`, !is_before_now)
                                machine.save()
                                    .then((d) => {
                                        new Parse.Query(`Laundry`)
                                            .equalTo(`machine_id`, request.params.machine_id)
                                            .lessThanOrEqualTo(`timestamp`, +request.params.timestamp)
                                            .greaterThan(`timestamp`, +moment().tz(`Europe/Moscow`).add(-2, `hour`))
                                            .find()
                                            .then((books) => {
                                                let deal = () => {
                                                    new Parse.Query(`Laundry`)
                                                        .equalTo(`objectId`, books[0].id)
                                                        .first()
                                                        .then((d) => {
                                                            d.destroy()
                                                                .then((d) => { books.shift(); deal() })
                                                                .catch((d) => { response.send(d); console.error(d) })
                                                        })
                                                        .catch((d) => { response.send(d); console.error(d) })

                                                }
                                                if (books.length) {
                                                    deal()
                                                }
                                            })
                                            .catch((d) => { response.send(d); console.error(d) })
                                    })
                                    .catch((d) => { response.send(d); console.error(d) })
                            })
                            .catch((d) => { response.send(d); console.error(d) })
                    } else {
                        response.send(`permission denied`)
                    }
                })
                .catch((d) => { response.send(d); console.error(d) })
        })
        .catch((d) => { response.send(d); console.error(d) })
});

server.get(`/laundry/get_users_history/:user_id`, async (request, response, next) => {
    try {
        response.send((await new Parse.Query(`Laundry`).limit(1000000).equalTo(`user_id`, request.params.user_id).find()))
    } catch (error) {
        response.send(error)
    }
})

// get user
server.get(`/users/get_user/:user_id`, (request, response, next) => {
    become(request)
        .then((user) => {
            new Parse.Query(`User`)
                .limit(1000000)
                .equalTo(`objectId`, request.params.user_id)
                .first()
                .then((d) => { response.send(d) })
                .catch((d) => { response.send(d); console.error(d) })
        })
        .catch((d) => { response.send(d); console.error(d) })
});

server.get(`/users/get_users_list`, (request, response, next) => {
    become(request)
        .then((user) => {
            isAdmin(user)
                .then((d) => {
                    new Parse.Query(`User`)
                        .limit(1000000)
                        .find()
                        .then((users) => {
                            new Parse.Query(`Balance`)
                                .limit(1000000)
                                .find()
                                .then((balances) => {
                                    response.send(users.map((user, u_i) => user.set(`money`, balances.filter(i => i.get(`user_id`) === user.id)[0].get(`money`))))
                                })
                                .catch((d) => { response.send(d); console.error(d) })
                        })
                        .catch((d) => { response.send(d); console.error(d) })
                })
                .catch((d) => { response.send(d); console.error(d) })
        })
        .catch((d) => { response.send(d); console.error(d) })
});

server.get(`/roles/get_my_roles/`, (request, response, next) => {
    become(request)
        .then((user) => {
            new Parse.Query(`Roles`)
                .equalTo(`user_id`, user.id)
                .find()
                .then((d) => {
                    response.send(d.map(i => i.get(`role`)))
                })
                .catch((d) => { response.send(d); console.error(d) })
        })
        .catch((d) => { response.send(d); console.error(d) })
})

server.get(`/balance/edit/:user_id/:value`, (request, response, next) => {
    become(request)
        .then((user) => {
            isAdmin(user)
                .then((role) => {
                    if (role) {
                        new Parse.Query(`Balance`)
                            .limit(1000000)
                            .equalTo(`user_id`, request.params.user_id)
                            .first()
                            .then((users_balance) => {
                                users_balance.set(`money`, users_balance.get(`money`) + +request.params.value)
                                users_balance.save()
                                    .then((d) => {
                                        let Transactions = Parse.Object.extend(`Transactions`);
                                        new Transactions()
                                            .set(`status`, `done`)
                                            .set(`requested`, +request.params.value)
                                            .set(`recived`, +request.params.value)
                                            .set(`to`, request.params.user_id)
                                            .set(`from`, user.id)
                                            .save()
                                            .then((d) => { response.send(d.id) })
                                            .catch((d) => { response.send(d); console.error(d) })
                                    })
                                    .catch((d) => { response.send(d); console.error(d) })
                            })
                            .catch((d) => { response.send(d); console.error(d) })
                    } else {
                        response.send(`permission for editting balance denied`)
                    }
                })
                .catch((d) => { response.send(d); console.error(d) })
        })
        .catch((d) => { response.send(d); console.error(d) })
})

server.get(`/transactions/start_yandex/:value/:id`, (request, response, next) => {
    become(request)
        .then((user) => {
            var Transactions = Parse.Object.extend(`Transactions`);
            new Transactions()
                .set(`solid`, request.params.id)
                .set(`to`, user.id)
                .set(`from`, `yandex`)
                .set(`status`, `started`)
                .set(`requested`, +request.params.value)
                .save()
                .then((d) => { response.send(d.id) })
                .catch((d) => { response.send(d); console.error(d) })
        })
        .catch((d) => { response.send(d); console.error(d) })
})

server.get(`/machines/get`, (request, response, next) => {
    become(request)
        .then((user) => {
            new Parse.Query(`Machines`)
                .find()
                .then((d) => { response.send(d.sort((a, b) => +a.get(`createdAt`) - +b.get(`createdAt`))) })
                .catch((d) => { response.send(d); console.error(d) })
        })
        .catch((d) => { response.send(d); console.error(d) })
})

server.get(`/machines/create`, (request, response, next) => {
    become(request)
        .then((user) => {
            new Parse.Object(`Machines`)
                .set(`is_broken`, false)
                .set(`chill_untill`, undefined)
                .save()
                .then((d) => { response.send(d) })
                .catch((d) => { response.send(d); console.error(d) })
        })
        .catch((d) => { response.send(d); console.error(d) })
})

server.get(`/auth/:email/:password/:name`, async (request, response, next) => {
    if (request.params.email.indexOf(`@`) > -1) {
        Parse.User.logIn(request.params.email, request.params.password)
            .then(async (d) => {
                await d.set(`name`, request.params.name).save()
                response.send(d.get(`sessionToken`))
            })
            .catch((d) => {
                if (d.code === 101) {
                    Parse.User.signUp(request.params.email, request.params.password)
                        .then((user) => {
                            new Parse.Object(`Balance`)
                                .set(`user_id`, user.id)
                                .set(`money`, 0)
                                .save()
                                .then(async (new_user) => {
                                    (await new Parse.Query(`Roles`).equalTo(`role`, `ADMIN`).find())
                                        .forEach(async (i) => await create_notification(
                                            i.get(`user_id`),
                                            `Зарегистрирован пользователь с почтой ${user.get(`username`)}`
                                        ))
                                    response.send(user.get(`sessionToken`))
                                })
                                .catch((d) => { response.send(d); console.error(d) })
                        })
                        .catch((d) => { response.send(d); console.error(d) })
                } else {
                    response.send(d); console.error(d)
                }
            })
    } else {
        let error = `invalid email`
        response.send(error); console.error(error)
    }
})

server.get(`/auth/sign_out`, (request, response, next) => {
    become(request)
        .then((d) => {
            console.log(d);
            Parse.User.logOut()
                .then((user) => { response.send(user) })
                .catch((d) => { response.send(d); console.error(d) })
        })
        .catch((d) => { response.send(d); console.error(d) })
})

server.get(`/user/get_my_info`, async (request, response, next) => { response.send(await become(request)) })

server.post(`/user/set_my_avatar`, async (request, response, next) => {
    let user = await become(request)
    if (user) { response.send(await user.set(`avatar`, request.body.url).save()) }
})

server.get(`/laundry/book/:timestamp/:machine_id`, async (request, response, next) => {
    let user = await become(request)
    if (user) {
        let is_free = (await new Parse.Query(`Laundry`).equalTo(`timestamp`, +request.params.timestamp).equalTo(`machine_id`, request.params.machine_id).find()).length === 0
        if (is_free) {
            let machine_index = (await new Parse.Query(`Machines`).find()).map(i => i.id).indexOf(request.params.machine_id) + 1
            let notification_id = (await new Parse.Object(`Notifications`).set(`user_id`, user.id).set(`status`, `delayed`).set(`delivery_timestamp`, +moment(+request.params.timestamp).tz(`Europe/Moscow`).add(-1, `hour`)).set(`message`, `🧺 Напоминаем о предстоящей стирке\nДата: ${days_of_week_short[moment(+request.params.timestamp).tz(`Europe/Moscow`).isoWeekday() - 1]} ${moment(+request.params.timestamp).tz(`Europe/Moscow`).format(`DD.MM.YY`)}\nВремя: ${moment(+request.params.timestamp).tz(`Europe/Moscow`).format(`HH:mm`)}\nМашинка: ${machine_index}`).save()).id
            let cost = +((await new Parse.Query(`Constants`).equalTo(`name`, `laundry_cost`).first()).get(`value`))
            let laundry = await new Parse.Object(`Laundry`).set(`timestamp`, +request.params.timestamp).set(`machine_id`, request.params.machine_id).set(`user_id`, user.id).set(`book_cost`, cost).set(`notification_id`, notification_id).save()
            let balance = await new Parse.Query(`Balance`).limit(1000000).equalTo(`user_id`, user.id).first()
            await balance.set(`money`, balance.get(`money`) - cost).save()
            response.send(laundry)
            try {
                await Mailer.sendEmail({
                    email: user.get(`username`),
                    subject: `Стиралка`,
                    html: `
                        <html>
                        <title>Стиралка</title>
                        <div>Вы запланировали стирку 🧺:</div>
                        <div>Дата: ${days_of_week_short[moment(+request.params.timestamp).tz(`Europe/Moscow`).isoWeekday() - 1]} ${moment(+request.params.timestamp).tz(`Europe/Moscow`).format(`DD.MM.YY`)}</div>
                        <div>Время: ${moment(+request.params.timestamp).tz(`Europe/Moscow`).format(`HH:mm`)}</div>
                        <div>Общежитие: 7</div>
                        <div>Машинка: ${machine_index}</div>
                        </html>
                    `
                })
            } catch (error) {
                console.log(error);
            }
        }
    }
})

server.get(`/laundry/set_laundry_cost/:new_value`, (request, response, next) => {
    become(request)
        .then((user) => {
            isAdmin(user)
                .then((role) => {
                    if (role) {
                        new Parse.Query(`Constants`)
                            .equalTo(`name`, `laundry_cost`)
                            .first()
                            .then((d) => {
                                d
                                    .set(`value`, request.params.new_value)
                                    .save()
                                    .then((d) => { response.send(d) })
                                    .catch((d) => { response.send(d); console.error(d) })

                            })
                            .catch((d) => { response.send(d); console.error(d) })
                    }
                })
        })
        .catch((d) => { response.send(d); console.error(d) })
})

server.get(`/laundry/get_laundry_cost`, async (request, response, next) => {
    response.send((await new Parse.Query(`Constants`).equalTo(`name`, `laundry_cost`).first()).get(`value`) + ``)
})

server.get(`/balance/get_my_balance`, async (request, response, next) => {
    let user = await become(request)
    if (user) { response.send((await new Parse.Query(`Balance`).equalTo(`user_id`, user.id).first()).get(`money`) + ``) }
})

server.get(`/auth/create_verificatoin_pass/:email/:telegram_id/:telegram_username`, (request, response, next) => {
    let pass = new Array(5).fill(0).map(i => Math.round(Math.random() * 10)).join(``).substring(0, 5)
    new Parse.Query(`User`)
        .limit(1000000)
        .equalTo(`username`, request.params.email)
        .first()
        .then((d) => {
            if (d) {
                if (d.get(`telegram`)) {
                    response.send(`already connected`)
                } else {
                    new Parse.Object(`Verifications`)
                        .set(`pass`, pass)
                        .set(`telegram_id`, request.params.telegram_id)
                        .set(`telegram_username`, request.params.telegram_username)
                        .set(`username`, request.params.email)
                        .save()
                        .then((d) => {
                            response.send(pass);
                            setTimeout(() => {
                                new Parse.Query(`Verifications`)
                                    .equalTo(`objectId`, d.id)
                                    .first()
                                    .then((d_to_destroy) => { d_to_destroy && d_to_destroy.destroy() })
                                    .catch((d) => { response.send(d); console.error(d) })

                            }, 60 * 1000)
                        })
                        .catch((d) => { response.send(d); console.error(d) })
                }
            } else {
                response.send(`wrong email`)
            }
        })
        .catch((d) => { response.send(d); console.error(d) })
})

server.get(`/auth/get_my_entries`, async (request, response, next) => {
    let user = await become(request)
    if (user) { response.send((await new Parse.Query(`Verifications`).equalTo(`username`, user.get(`username`)).find()).length > 0) }
})

let create_notification = async (user_id, message, delivery_timestamp) => await new Parse.Object(`Notifications`)
    .set(`delivery_timestamp`, delivery_timestamp ? delivery_timestamp : +moment().tz(`Europe/Moscow`))
    .set(`status`, `delayed`)
    .set(`user_id`, user_id)
    .set(`message`, message)
    .save()

server.get(`/auth/check_verificatoin_pass/:pass`, (request, response, next) => {
    become(request)
        .then((user) => {
            new Parse.Query(`Verifications`)
                .equalTo(`username`, user.get(`username`))
                .first()
                .then((verification) => {
                    if (verification.get(`pass`) === request.params.pass) {
                        user.set(`telegram`, {
                            id: verification.get(`telegram_id`),
                            username: verification.get(`telegram_username`),
                        })
                        user.save()
                            .then(async (d) => {
                                await verification.destroy()
                                await create_notification(user.id, `Теперь Ваш dcam аккаунт в связке с telegram.`)
                                response.send(`success`)
                            })
                            .catch((d) => { response.send(d); console.error(d) })
                    } else {
                        response.send(`password denied`)
                    }
                })
                .catch((d) => { response.send(d); console.error(d) })
        })
        .catch((d) => { response.send(d); console.error(d) })
})

server.get(`/auth/forget_my_telegram`, async (request, response, next) => {
    try {
        let user = await become(request)
        if (user) {
            try {
                await create_notification(user.id, `Больше этот telegram аккаунт не связан с dcam профилем ${user.get(`username`).split(`@`)[0].split(`.`)[0]}.`)
                await user.set(`telegram`, null).save()
                response.send(`successfully unpinned telegram account`)
            } catch {
                response.send(`error while unpining telegram account`)
            }
        }
    } catch (error) {
        response.send(error)
    }
})

let get_transactions = async (user_id) => {
    let users = await new Parse.Query(`User`).limit(1000000).select(`objectId`).select(`username`).find()
    let query = new Parse.Query(`Transactions`).limit(1000000)
    if (user_id) {
        query = Parse.Query.or(new Parse.Query(`Transactions`).limit(1000000).equalTo(`from`, user_id), new Parse.Query(`Transactions`).limit(1000000).equalTo(`to`, user_id))
    }
    let transactions = await query.find()
    return (transactions.map((i) => {
        let from_user = users.filter(u => u.id === i.get(`from`))[0]
        let to_user = users.filter(u => u.id === i.get(`to`))[0]
        return {
            ...i.attributes,
            from_username: from_user ? from_user.get(`username`).split(`@`)[0].split(`.`)[0] : i.get(`from`),
            to_username: to_user ? to_user.get(`username`).split(`@`)[0].split(`.`)[0] : i.get(`to`)
        }
    }))
}

server.get(`/transactions/get_my_transactions`, async (request, response, next) => {
    try {
        let user = await become(request)
        if (user) {
            response.send(await get_transactions(user.id))
        }
    } catch (error) {
        response.send(error)
    }
})

server.get(`/transactions/get_all_transactions`, async (request, response, next) => {
    try {
        if (await isAdmin(await become(request))) {
            response.send(await get_transactions())
        }
    } catch (error) {
        response.send(error)
    }
})

let get_notifications = async (user_id) => {
    let query = new Parse.Query(`Notifications`).limit(1000000)
    if (user_id) {
        query.equalTo(`user_id`, user_id)
    }
    let notifications = await query.find()
    let users = await new Parse.Query(`User`).limit(1000000).find()
    notifications.forEach(i => { i.set(`username`, users.filter(u => u.id === i.get(`user_id`))[0].get(`username`)) })
    return notifications
}

server.get(`/notifications/get_all_notifications`, async (request, response, next) => {
    try {
        if (await isAdmin(await become(request))) {
            response.send(await get_notifications())
        }
    } catch (error) {
        response.send(error)
    }
}
)

server.get(`/notifications/get_my_notifications`, async (request, response, next) => {
    try {
        let user = await become(request)
        if (user) {
            response.send(await get_notifications(user.id))
        }
    } catch (error) {
        response.send(error)
    }
})

server.get(`/notifications/match_as_checked`, async (request, response, next) => {
    try {
        let user = await become(request)
        if (user) {
            let notifications = await new Parse.Query(`Notifications`).equalTo(`user_id`, user.id).limit(1000000).find()
            for (let i in notifications) {
                await notifications[i].set(`status`, `checked`).save()
            }
            response.send(`success`)
        }
    } catch (error) {
        response.send(error)
    }
})

server.post(`/targets/create/:name/:dormitory_id`, async (request, response, next) => {
    try {
        let user = await become(request)
        if (user) {
            if (await isAdmin(user)) {
                const data = Array.from(Buffer.from(request.body, 'binary'))
                const contentType = request.headers['content-type'];
                const parseFile = new Parse.File('logo.svg', data, contentType)
                await new Parse.Object(`Targets`)
                    .set(`avatar`, parseFile)
                    .set(`name`, request.params.name)
                    .set(`dormitory_id`, request.params.dormitory_id)
                    .save()
                response.send(`plan created with success`)
            } else {
                response.send(`no permission`)
            }
        }
    } catch (error) {
        response.send(error)
    }
})

server.get(`/targets/get`, async (request, response, next) => {
    try {
        let user = await become(request)
        if (user) {
            response.send(await new Parse.Query(`Targets`).find())
        }
    } catch (error) {
        response.send(error)
    }
})

server.post(`/events/create/`, async (request, response, next) => {
    try {
        let user = await become(request)
        if (user) {
            await new Parse.Object(`Events`)
                .set(`user_id`, user.id)
                .set(`start_timestamp`, +request.body.start)
                .set(`end_timestamp`, +request.body.end)
                .set(`target_id`, request.body.target_id)
                .set(`number_of_people`, request.body.number_of_people)
                .set(`aim`, request.body.aim)
                .set(`accepted`, false)
                .save()

            let target_name = (await new Parse.Query(`Targets`).equalTo(`objectId`, request.body.target_id).first()).get(`name`)

            let owners = (await new Parse.Query(`Roles`).equalTo(`target_id`, request.body.target_id).find()).map(i => i.get(`user_id`))
            owners = await Promise.all(owners.map(async (i) => (await new Parse.Query(`User`).equalTo(`objectId`, i).first()).get(`username`)));

            try {
                await Promise.all(owners.forEach(async i => {
                    try {
                        await Mailer.sendEmail({
                            email: i,
                            subject: `Уведомление ответственному за ${target_name}`,
                            html: `Пользователь ${user.get(`username`)} создал мероприятие`
                        })
                    } catch (error) {
                        console.log(error);
                    }
                }))
            } catch (error) {
                console.log(error);
            }

            try {
                await Mailer.sendEmail({
                    email: user.get(`username`),
                    subject: `Студсовет ФПМИ`,
                    html: `
                        <html>
                        <div>Вы создали мероприятие в помещении: <b>${target_name}</b></div>
                        <div>Новый статус: <b>ожидание</b></div>
                        <div>Заведующие помещением: ${owners.join(`, `)}</div>
                        </html>
                    `
                })
            } catch (error) {
                console.log(error);
            }

            response.send(user)
        }
    } catch (error) {
        response.send(error)
    }
})

server.post(`/events/edit/`, async (request, response, next) => {
    try {
        let user = await become(request)
        if (user) {
            let event = await new Parse.Query(`Events`).equalTo(`objectId`, request.body.objectId).first()
            await event
                .set(`start_timestamp`, +request.body.start)
                .set(`end_timestamp`, +request.body.end)
                .set(`number_of_people`, request.body.number_of_people)
                .set(`aim`, request.body.aim)
                .save()
            response.send(`plan created with success`)
        }
    } catch (error) {
        response.send(error)
    }
})

server.get(`/events/get`, async (request, response, next) => {
    try {
        let user = await become(request)
        if (user) {
            let users = (await new Parse.Query(`User`).limit(1000000).select(`username`).find()).map(i => { return { username: i.get(`username`), user_id: i.id, } })
            let events = (await new Parse.Query(`Events`).greaterThanOrEqualTo(`start_timestamp`, +moment().tz(`Europe/Moscow`).startOf(`isoWeek`)).find()).map(i => {
                let u_ = users.filter(j => j.user_id === i.get(`user_id`))[0]
                i.set(`username`, u_.username)
                i.set(`avatar`, u_.avatar)
                return i
            })
            response.send(events)
        }
    } catch (error) {
        response.send(error)
    }
})

server.get(`/events/accept/:event_id/:value`, async (request, response, next) => {
    try {
        if (await isAdmin(await become(request))) {
            let username = (await new Parse.Query(`User`).equalTo(`objectId`, (await new Parse.Query(`Events`).equalTo(`objectId`, request.params.event_id).first()).get(`user_id`)).first()).get(`username`)
            if (request.params.value == `true`) {
                await (await new Parse.Query(`Events`).equalTo(`objectId`, request.params.event_id).first()).set(`accepted`, true).save()
            } else {
                await (await new Parse.Query(`Events`).equalTo(`objectId`, request.params.event_id).first()).destroy()
            }
            try {
                await Mailer.sendEmail({
                    email: username,
                    subject: `Студсовет ФПМИ`,
                    html: `
                        <html>
                        <div>Обновлен статус Вашего мероприятия</div>
                        <div>Новый статус: <b>${request.params.value == `true` ? `одобрено` : `отклонено`}</b></div>
                        </html>
                    `
                })
            } catch (error) {
                console.log(error);
            }
            response.send(`${request.params.value == `true` ? `accepted` : `denied`} successfully`)
        }
    } catch (error) {
        response.send(error)
    }
})

server.get(`/events/delete/:event_id`, async (request, response, next) => {
    try {
        let user = await become(request)
        let event = await new Parse.Query(`Events`).equalTo(`objectId`, request.params.event_id).first()
        if (event.get(`user_id`) === user.id || await isAdmin(user)) {
            event.destroy()
            // await Mailer.sendEmail({
            //     email: user.get(`username`),
            //     subject: `Студсовет ФПМИ`,
            //     html: `
            //         <html>
            //         <div>Ваше мероприятие удалено/div>
            //         </html>
            //     `
            // })
            response.send(`deleted successfully`)
        } else {
            response.send(`error while deleting event: no permission`)
        }
    } catch (error) {
        response.send(error)
    }
})

server.get(`/dormitory/get`, async (request, response, next) => {
    try {
        response.send(await new Parse.Query(`Dormitory`).find())
    } catch (error) {
        response.send(error)
    }
})

server.get(`/dev`, async (request, response, next) => {
    try {
        // let d = await Parse.User.requestPasswordReset("beldiy.dp@phystech.edu");
        let d = await Mailer.sendEmail({
            email: `beldiy.dp@phystech.edu`,
            subject: `Стиралка`,
            html: `hello world`
        })
        response.send(d)
    } catch (error) {
        response.send(error)
    }
})