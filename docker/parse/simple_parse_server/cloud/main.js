// Parse.Cloud.define(`averageStars`, (request, response) => {
// 	response.success({hello: +new Date()});
// });

// Add balance to new user
Parse.Cloud.afterSave(Parse.User, (request) => {
	new Parse.Query(`Balance`).equalTo(`userId`, request.object.id).first()
		.then((d) => {
			if (!d) {
				var Balance = Parse.Object.extend(`Balance`);
				var balance = new Balance();
				balance.set(`userId`, request.object.id)
				balance.set(`money`, 100)
				// balance.setACL(new Parse.ACL(request.object));
				balance.save()
					.then((d) => { console.log(d) })
					.catch((d) => { console.log(d) })
			}
		})
		.catch((d) => { console.log(d) })

});

// Poset request for new laundry book with following 'data' object:
// - timestamp: integer
// - machineId: string
Parse.Cloud.define(`setLaundry`, (request, response) => {
	var laundryQuery = new Parse.Query(`Laundry`)
	laundryQuery.equalTo(`timestamp`, request.params.timestamp)
	laundryQuery.equalTo(`machineId`, request.params.machineId)
	laundryQuery.find()
		.then((laundry) => {
			if (!laundry.length) {
				var costQuery = new Parse.Query(`Constants`)
				costQuery.equalTo(`name`, `laundry_cost`)
				costQuery.first()
					.then((cost) => {
						var object = new Parse.Object(`Laundry`)
						object.set(`timestamp`, request.params.timestamp)
						object.set(`machineId`, request.params.machineId)
						object.set(`userId`, request.user.id)
						object.set(`book_cost`, +cost.get(`value`))
						object.save()
							.then((d) => {
								var balanceQuery = new Parse.Query(`Balance`)
								balanceQuery.equalTo(`userId`, request.user.id)
								balanceQuery.first()
									.then((userBalance) => {
										userBalance.set(`money`, userBalance.get(`money`) - +cost.get(`value`))
										userBalance.save()
											.then((d) => { response.success(d) })
											.catch((d) => { response.error() })
									})
									.catch((d) => { response.error() })

							})
							.catch((d) => { response.error() })
					})
					.catch((d) => { response.error() })
			} else {
				response.error(`error: laundry booking for this time is already exists`)
			}
		})
		.catch((d) => { response.error() })
});

// Get request for existing laundry books
Parse.Cloud.define(`getLaundry`, (request, response) => {
	new Parse.Query(`Laundry`).find()
		.then((laundry_list) => {
			new Parse.Query(`User`).find()
				.then((users_list) => {
					response.success(laundry_list
						.filter(laundry => users_list.map(i => i.id).indexOf(laundry.get(`userId`)) > -1)
						.map(laundry => {
							return ({
								machineId: laundry.get(`machineId`),
								userId: laundry.get(`userId`),
								timestamp: laundry.get(`timestamp`),
								laundryId: laundry.id,
								name: users_list.filter(user => user.id === laundry.get(`userId`))[0].get(`name`).split(` `)[2],
								vk: users_list.filter(user => user.id === laundry.get(`userId`))[0].get(`vk`)
							})
						}))
				})
				.catch((d) => { response.error(d) })
		})
		.catch((d) => { response.error(d) })
});

Parse.Cloud.afterDelete(`Laundry`, (request, response) => {
	var balanceQuery = new Parse.Query(`Balance`)
	balanceQuery.equalTo(`userId`, request.object.get(`userId`))
	balanceQuery.first()
		.then((balance) => {
			balance.set(`money`, balance.get(`money`) + request.object.get(`book_cost`))
			balance.save()
				.then((d) => { response.success() })
				.catch((d) => { response.error() })
		})
		.catch((d) => { response.error() })

	response.success(request)
});

Parse.Cloud.define(`saveTransaction`, (request, response) => {
	var Transactions = Parse.Object.extend(`Transactions`);
	var transactions = new Transactions();
	transactions.set(`userId`, request.user.id)
	transactions.set(`status`, `started`)
	transactions.set(`requested`, request.params.value)
	transactions.save()
		.then((d) => { response.success(d.id) })
		.catch((d) => { console.log(d) })
});

Parse.Cloud.define(`createNfcRecord`, (request, response) => {
	var nfc_query = Parse.Object.extend(`NFC`);
	var nfc_record = new nfc_query();
	nfc_record.set(`uid`, request.params.value)
	nfc_record.set(`userId`, request.user.id)
	// nfc_record.setACL(new Parse.ACL(request.user));
	nfc_record.save()
		.then((d) => { response.success(d.id) })
		.catch((d) => { response.error(d) })
});

// request should contain object with such fields: location, start_timestamp, end_timestamp, is_regular and data.
Parse.Cloud.define(`createClubBook`, (request, response) => {
	var club_query = Parse.Object.extend(`Club`);
	var club_record = new club_query();
	club_record.set(`userId`, request.user.id)
	club_record.set(`location`, request.params.location)
	club_record.set(`start_timestamp`, request.params.start_timestamp)
	club_record.set(`end_timestamp`, request.params.end_timestamp)
	club_record.set(`is_regular`, request.params.is_regular)
	club_record.set(`is_allowed`, false)
	club_record.set(`data`, request.params.data)
	club_record.save()
		.then((d) => { response.success(d.id) })
		.catch((d) => { response.error(d) })
});

// Get request for existing laundry books
Parse.Cloud.define(`getClubBooks`, (request, response) => {
	new Parse.Query(`Club`)
		.greaterThan(`start_timestamp`, +new Date())
		.find()
		.then((club_book) => {
			new Parse.Query(`User`)
				.find()
				.then((users) => {
					var new_club_book = club_book.map(book => {
						return ({
							event_id: book.id,
							location: book.get(`location`),
							start_timestamp: book.get(`start_timestamp`),
							end_timestamp: book.get(`end_timestamp`),
							is_regular: book.get(`is_regular`),
							is_allowed: book.get(`is_allowed`),
							data: book.get(`data`),
							owner: users.filter(i => i.id === book.get(`userId`))[0].get(`name`),
						})
					})
					response.success(new_club_book)
				})
				.catch((d) => { response.error(d) })
		})
		.catch((d) => { response.error(d) })
});

Parse.Cloud.define(`chengeClubEventResolution`, (request, response) => {
	new Parse.Query(`Roles`)
		.equalTo(`role`, `ADMIN`)
		.equalTo(`userId`, request.user.id)
		.first()
		.then((d) => {
			if (d) {
				new Parse.Query(`Club`)
					.equalTo(`objectId`, request.params.event_id)
					.first()
					.then((d) => {
						d.set(`is_allowed`, !d.get(`is_allowed`))
						d.save()
							.then((d) => { response.success(d) })
							.catch((d) => { response.error(d) })
					})
					.catch((d) => { response.error(d) })
			} else {
				response.error(`You have no rights to perform an action.`)
			}
		})
		.catch((d) => { response.error(d) })
});