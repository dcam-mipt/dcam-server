#!/bin/bash
LIVEQUERY_SUPPORT=1
LIVEQUERY_CLASSES="Constants, Balance, Machines, Laundry, Transactions, NFC, Club"

SSH_HOST="root@$SERVER_IP"
WORK_DIR="/root/$MY_APP_NAME"

rm -rf .env

echo "
MY_APP_ID=$MY_APP_ID
MY_APP_API_KEY=$MY_APP_API_KEY
MY_APP_JS_KEY=$MY_APP_JS_KEY
MY_APP_MASTER_KEY=$MY_APP_MASTER_KEY
MY_APP_CLIENT_KEY=$MY_APP_CLIENT_KEY
PARSE_DASHBOARD_NAME=$PARSE_DASHBOARD_NAME
SERVER_IP=$SERVER_IP
MY_APP_NAME=$MY_APP_NAME
PARSE_SERVER_PORT=$PARSE_SERVER_PORT
PARSE_DASHBOARD_PORT=$PARSE_DASHBOARD_PORT
LIVEQUERY_SUPPORT=$LIVEQUERY_SUPPORT
LIVEQUERY_CLASSES=$LIVEQUERY_CLASSES
USER_NAME=$USER_NAME
USER_PASSWORD=$USER_PASSWORD
" > .env

echo "trying to connect to server $SSH_HOST"

ssh $SSH_HOST sh << END
	echo $WORK_DIR
	rm -rf $WORK_DIR
	rm -rf jobs
	mkdir $WORK_DIR
	mkdir "$WORK_DIR/cloud"
	mkdir "jobs"
END

#copying void cloud code

scp -r ./cloud/* "$SSH_HOST:$WORK_DIR/cloud"
scp -r ../../../jobs/* "$SSH_HOST:/root/jobs"
scp docker-compose.yaml "$SSH_HOST:$WORK_DIR"
scp .env "$SSH_HOST:$WORK_DIR"

rm -rf .env

# Installing docker
#if you have any problems while installing:
#  run
#     ps -A | grep apt
#     kill -9 pid
ssh $SSH_HOST '
	sudo apt-get update
	sudo apt-get install -y curl
	sudo apt-get install -y htop && sudo apt-get install -y tree
	curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo apt-key add -
	sudo add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable"
	sudo apt-get update
	apt-cache policy docker-ce
	sudo apt-get install -y docker-ce
	sudo rm -rf /var/lib/dpkg/lock
	sudo apt-get install -y docker-compose
	sudo apt-get install -y npm
	sudo npm install pm2 -g
	sudo npm install
	cd ~/jobs
	sudo npm install -y
	cd ~
	rm -rf package-lock.json
'

#launching docker-compose

ssh $SSH_HOST sh << END
	cd $WORK_DIR
	docker-compose down
	docker-compose build
	docker-compose up -d --force-recreate
	docker ps -a
	pm2 kill
	pm2 start ~/jobs/rest.js
	pm2 start ~/jobs/server_time.js
END

ssh $SSH_HOST