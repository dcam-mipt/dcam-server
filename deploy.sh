#!/bin/bash
git add .
git status -s
git commit -m `date '+%d.%m.%Y🌿%H:%M'`
git push

ENV_TYPE="$1"
SSH_SERVER_TEST=dev.dcam.pro
SSH_SERVER_PROD=dcam.pro
echo $ENV_TYPE

SSH_SERVER=$SSH_SERVER_TEST

if [ "dev" = $ENV_TYPE ]; then
    SSH_SERVER=$SSH_SERVER_TEST
fi

if [ "prod" = $ENV_TYPE ]; then
    SSH_SERVER=$SSH_SERVER_PROD
fi

scp -r ./jobs/* root@$SSH_SERVER:~/jobs
scp -r ./feathers/* root@$SSH_SERVER:~/feathers
ssh root@dcam.pro sh << END
    # pm2 start ./jobs/rest.js
    # pm2 start ./jobs/rest.js
	pm2 restart all
    pm2 start ./feathers/index.js
END