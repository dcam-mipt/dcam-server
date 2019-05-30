/*eslint-disable no-unused-vars*/
Parse.initialize(config.PARSE_APP_ID, config.PARSE_JS_KEY, config.PARSE_MASTER_KEY);
Parse.serverURL = config.PARSE_SERVER_URL

let openClient = () => {
        let client = new Parse.LiveQueryClient({
                applicationId: 'dcam',
                serverURL: 'ws://dcam.pro:1337/parse',
                javascriptKey: `dcam`,
                masterKey: `dcam`
        });
        client.open()
        // error is here
        return client
}

let createSubscriptionOnUpdate = (className, method, action) => {
        let client = openClient()
        let query = new Parse.Query(className)
        client.subscribe(query).on(method, (object) => { action(object) })
}

module.exports.subscripiton = createSubscriptionOnUpdate;
/*eslint-enable no-unused-vars*/