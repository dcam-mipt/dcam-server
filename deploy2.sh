#!/bin/bash

#root/dm*23Kp
#93.158.193.58 тест - sporttest-t.sportchampions.ru
#93.158.193.59 препрод (или хранилище) - sporttest-db.sportchampions.ru
#93.158.193.60 прод - sporttest.sportchampions.ru

ENV_TYPE="$1"

SSH_SERVER_TEST=root@sporttest-t.sportchampions.ru
SSH_SERVER_STAGE=root@sporttest-db.sportchampions.ru
SSH_SERVER_PROD=root@sporttest.sportchampions.ru

echo $ENV_TYPE

SERVER_SSH_PORT=22
SSH_SERVER=$SSH_SERVER_TEST

if [ "dev" = $ENV_TYPE ]; then
    SSH_SERVER=$SSH_SERVER_TEST
fi

if [ "prod" = $ENV_TYPE ]; then
    SSH_SERVER=$SSH_SERVER_PROD
fi

if [ "stage" = $ENV_TYPE ]; then
    SSH_SERVER=$SSH_SERVER_STAGE
fi

ssh $SSH_SERVER -p $SERVER_SSH_PORT '
    echo $(pwd)
    rm -rf /tmp/deploy_sabir
    mkdir /tmp/deploy_sabir
    mkdir /tmp/deploy_sabir/helpers
    mkdir /tmp/deploy_sabir/modules
    mkdir /tmp/deploy_sabir/services
    cd /tmp/deploy_sabir
    pwd
'

scp -P $SERVER_SSH_PORT -r ./helpers/ $SSH_SERVER:/tmp/deploy_sabir/
scp -P $SERVER_SSH_PORT -r ./modules/ $SSH_SERVER:/tmp/deploy_sabir/
scp -P $SERVER_SSH_PORT -r ./services/ $SSH_SERVER:/tmp/deploy_sabir/
scp -P $SERVER_SSH_PORT  ./index.js $SSH_SERVER:/tmp/deploy_sabir/
scp -P $SERVER_SSH_PORT  ./package.json $SSH_SERVER:/tmp/deploy_sabir/
scp -P $SERVER_SSH_PORT  ./config.js $SSH_SERVER:/tmp/deploy_sabir/
scp -P $SERVER_SSH_PORT  ./Dockerfile $SSH_SERVER:/tmp/deploy_sabir/


ssh $SSH_SERVER -p $SERVER_SSH_PORT '
    cd /tmp/deploy_sabir
    docker kill moskomsport-tools-server
    docker rm moskomsport-tools-server
    docker build -t moskomsport-tools-server .
    docker run -p 8080:3000 -d --name moskomsport-tools-server --restart unless-stopped moskomsport-tools-server
'
