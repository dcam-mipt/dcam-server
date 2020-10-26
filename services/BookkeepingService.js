/*eslint-disable*/
const DOMAIN_URL = `https://dcam.pro`;

const ParseAPI = require('../modules/ParseAPI');
const NotificationsAPI = require('../modules/NotificationsAPI');

const BookkeepingService = module.exports = {

    addRequestHandlers(server) {

        server.get(`/get-transactions-dump`, async (request, response, next) => {
            try {
                let transaction = await new Parse.Query(`Transactions`).limit(1000000).find()
                response.send(transaction)
            } catch (error) {
                response.send(error)
            }
        })

    }

}
/*eslint-enable*/