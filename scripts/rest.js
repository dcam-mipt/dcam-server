var restify = require('restify');
var CookieParser = require('restify-cookies');
var Parse = require('parse/node')
var config = require('./config')
var corsMiddleware = require('restify-cors-middleware');
var moment = require('moment-timezone')
var axios = require(`axios`)

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
            user.set(`last_seen`, +moment())
            user.save()
                .then((d) => { resolve(d) })
                .catch((d) => { reject(d) })
        })
        .catch((d) => { reject(d) })
})

let changeBalance = (user, value, author) => new Promise((resolve, reject) => {
    console.log(`< < <`, user, value, author);
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
            code: 209,
        }, sessionToken)
        return
    }
    Parse.User.become(sessionToken)
        .then((user) => {
            console.log(`> > > become:`, user.get(`username`), sessionToken);
            updateActivity(user)
            resolve(user)
        })
        .catch((d) => { reject(d) })
})


let isAdmin = (user) => new Promise((resolve, reject) => {
    new Parse.Query(`Roles`)
        .equalTo(`user_id`, user.objectId)
        .equalTo(`role`, `ADMIN`)
        .first()
        .then((d) => { resolve(true) })
        .catch((d) => { resolve(false) })
})


server.post('/yandex/', (req, res, next) => {
    console.log(` - - - > > > incoming request:`, req.body.label, req.body.amount, `RUB`)
    new Parse.Query(`Transactions`)
        .equalTo(`objectId`, req.body.label)
        .first()
        .then((transaction) => {
            new Parse.Query(`Balance`)
                .limit(1000000)
                .equalTo(`user_id`, transaction.get(`to`))
                .first()
                .then((balance) => {
                    if (transaction.get(`status`) !== `done`) {
                        balance.set(`money`, balance.get(`money`) + +req.body.withdraw_amount)
                        // balance.set(`money`, balance.get(`money`) + +req.body.amount)
                        balance.save()
                            .then((d) => {
                                transaction.set(`status`, `done`)
                                transaction.set(`recived`, +req.body.withdraw_amount)
                                transaction.set(`recived`, +req.body.amount)
                                transaction.save()
                                    .then((d) => { console.log(d) })
                                    .catch((d) => { response.send(d); console.error(d) })
                            })
                            .catch((d) => { response.send(d); console.error(d) })
                    }
                })
                .catch((d) => { response.send(d); console.error(d) })
        })
        .catch((d) => { response.send(d); console.error(d) })
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
                .then((d) => {
                    changeBalance(d.get(`user_id`), d.get(`book_cost`), user)
                        .then((new_balance) => {
                            let message = `laundry: unbook (${d.get(`user_id`)}, ${d.get(`machine_id`)}, ${moment(d.get(`timestamp`)).format(`DD.MM.YY HH:mm`)})`
                            writeLog(message, user)
                            d.destroy()
                                .then((d) => { response.send(d) })
                                .catch((d) => { response.send(d); console.error(d) })
                        })
                        .catch((d) => { response.send(d); console.error(d) })
                })
                .catch((d) => { response.send(d); console.error(d) })
        })
        .catch((d) => { response.send(d); console.error(d) })
});

server.get(`/laundry/get`, (request, response, next) => {
    become(request)
        .then((d) => {
            new Parse.Query(`User`)
                .limit(1000000)
                .find()
                .then((users) => {
                    new Parse.Query(`Laundry`)
                        .greaterThanOrEqualTo(`timestamp`, +moment().startOf(`week`))
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
        })
        .catch((d) => { response.send(d); console.error(d) })
});

server.get(`/laundry/broke_machine/:machine_id/:timestamp`, (request, response, next) => {
    become(request)
        .then((user) => {
            isAdmin(user)
                .then((role) => {
                    if (role) {
                        let is_before_now = +request.params.timestamp < +moment().add(-2, `hour`)
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
                                            .greaterThan(`timestamp`, +moment().add(-2, `hour`))
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

server.get(`/balance/get_by_balance`, (request, response, next) => {
    become(request)
        .then((user) => {
            new Parse.Query(`Balance`)
                .equalTo(`user_id`, user.id)
                .first()
                .then((d) => { response.send(d.get(`money`)) })
                .catch((d) => { response.send(d); console.error(d) })
        })
        .catch((d) => { response.send(d); console.error(d) })
})

server.get(`/transactions/start_yandex/:value`, (request, response, next) => {
    become(request)
        .then((user) => {
            var Transactions = Parse.Object.extend(`Transactions`);
            new Transactions()
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

server.get(`/auth/:email/:password`, (request, response, next) => {
    Parse.User.logIn(request.params.email, request.params.password)
        .then((d) => { response.send(d.get(`sessionToken`)) })
        .catch((d) => {
            if (d.code === 101) {
                Parse.User.signUp(request.params.email, request.params.password)
                    .then((user) => {
                        new Parse.Object(`Balance`)
                            .set(`user_id`, user.id)
                            .set(`money`, 100)
                            .save()
                            .then((d) => { response.send(user.get(`sessionToken`)) })
                            .catch((d) => { response.send(d); console.error(d) })
                    })
                    .catch((d) => { response.send(d); console.error(d) })
            } else {
                response.send(d); console.error(d)
            }
        })
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

server.get(`/user/get_my_info`, (request, response, next) => {
    become(request)
        .then((user) => { response.send(user) })
        .catch((d) => { response.send(d); console.error(d) })
})

server.post(`/user/set_my_avatar`, (request, response, next) => {
    become(request)
        .then((user) => {
            user
                .set(`avatar`, request.body.url)
                .save()
                .then((d) => { response.send(d); })
                .catch((d) => { response.send(d); console.error(d) })
        })
        .catch((d) => { response.send(d); console.error(d) })
})

server.get(`/laundry/book/:timestamp/:machine_id`, (request, response, next) => {
    become(request)
        .then((user) => {
            new Parse.Query(`Laundry`)
                .equalTo(`timestamp`, +request.params.timestamp)
                .equalTo(`machine_id`, request.params.machine_id)
                .find()
                .then((laundry) => {
                    if (laundry.length) {
                        response.send(`error: laundry booking for this time is already exists`)
                    } else {
                        new Parse.Query(`Constants`)
                            .equalTo(`name`, `laundry_cost`)
                            .first()
                            .then((cost) => {
                                new Parse.Query(`Balance`)
                                    .equalTo(`user_id`, user.id)
                                    .first()
                                    .then((userBalance) => {
                                        if (userBalance.get(`money`) < +cost.get(`value`)) {
                                            let message = `laundry: user ${user.id} has not enough money: ${userBalance.get(`money`)} rub`
                                            writeLog(message, user)
                                            response.send(message);
                                        } else {
                                            new Parse.Object(`Laundry`)
                                                .set(`timestamp`, +request.params.timestamp)
                                                .set(`machine_id`, request.params.machine_id)
                                                .set(`user_id`, user.id)
                                                .set(`book_cost`, +cost.get(`value`))
                                                .save()
                                                .then((d) => {
                                                    userBalance.set(`money`, userBalance.get(`money`) - +cost.get(`value`))
                                                    userBalance.save()
                                                        .then((d) => {
                                                            let message = `laundry: book (${d.get(`user_id`)}, ${request.params.machine_id},${moment(+request.params.timestamp).format(`DD.MM.YY HH:mm`)})`
                                                            writeLog(message, user)
                                                            response.send(d)
                                                        })
                                                        .catch((d) => { response.send(d); console.error(d) })
                                                })
                                                .catch((d) => { response.send(d); console.error(d) })
                                        }
                                    })
                                    .catch((d) => { response.send(d); console.error(d) })
                            })
                            .catch((d) => { response.send(d); console.error(d) })
                    }
                })
                .catch((d) => { response.send(d); console.error(d) })
        })
        .catch((d) => { response.send(d); console.error(d) })
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

server.get(`/laundry/get_laundry_cost`, (request, response, next) => {
    become(request)
        .then((user) => {
            new Parse.Query(`Constants`)
                .equalTo(`name`, `laundry_cost`)
                .first()
                .then((d) => { response.send(d.get(`value`)) })
                .catch((d) => { response.send(d); console.error(d) })
        })
        .catch((d) => { response.send(d); console.error(d) })
})