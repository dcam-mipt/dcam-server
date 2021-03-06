#!/bin/bash
SSH_SERVER=134.209.188.240
ssh root@$SSH_SERVER sh << END

    printf '\n\n\n> > > ufw < < <\n\n\n'

	sudo apt-get install ufw
    sudo ufw default deny incoming
    sudo ufw default allow outgoing
    sudo ufw allow ssh
    echo y | sudo ufw enable
    sudo ufw status verbose
    ufw allow 3000
    echo y | ufw enable

    curl -sL https://deb.nodesource.com/setup_13.x | sudo -E bash -printf '\n\n\n> > > nginx < < <\n\n\n'

    sudo apt update
    echo y | sudo apt install nginx
    sudo ufw app list
    sudo ufw allow 'Nginx HTTP'
    sudo ufw status
    sudo apt update

    printf '\n\n\n> > > zip < < <\n\n\n'
    echo y | sudo apt-get install zip

    printf '\n\n\n> > > node < < <\n\n\n'

    echo Y | sudo apt install nodejs npm
    nodejs --version
    sudo apt install npm

    printf '\n\n\n> > > yarn < < <\n\n\n'

    curl -sS https://dl.yarnpkg.com/debian/pubkey.gpg | sudo apt-key add -
     
    sudo apt update
    echo Y | sudo apt install yarn
    sudo apt install --no-install-recommends yarn
    yarn --version

    printf '\n\n\n> > > pm2 < < <\n\n\n'

    sudo npm install pm2@latest -g

    printf '\n\n\n> > > mongo < < <\n\n\n'

    sudo apt update
    echo Y | sudo apt install mongodb
    sudo systemctl status mongodb

    rm -rf *

    printf '\n\n\n> > > parse-dashboard < < <\n\n\n'
    npm install -g parse-dashboard

END

printf '\n\n\n> > > deploy front < < <\n\n\n'
cd ../dcam-web-app/
./deploy.sh
cd ../dcam-server/

printf '\n\n\n> > > copy files to server < < <\n\n\n'
scp -r ./* root@$SSH_SERVER:~/

ssh root@$SSH_SERVER sh << END

    printf '\n\n\n> > > setup nginx server blocks < < <\n\n\n'
    chmod +x ./scripts/nginx.sh
    chmod +x ./scripts/backup.sh
    chmod +x ./scripts/dashboard.sh
    chmod +x ./backup/restore.sh
    ./scripts/nginx.sh

    printf '\n\n\n> > > install packages && restart < < <\n\n\n'
    printf '\n> > > parse\n' && cd parse && yarn install && cd ../
    printf '\n> > > scripts\n' && cd scripts && yarn install && cd ../
    printf '\n> > > backup\n' && cd backup && yarn install && cd ../
    
    printf '\n\n\n> > > start pm2 ecosystem < < <\n\n\n'
    pm2 kill
    pm2 start ./scripts/ecosystem.json
    
END

# sudo apt-get install curl
# curl -sL https://deb.nodesource.com/setup_12.x | sudo -E bash -
# sudo apt-get install nodejs
# node -v 
# npm -v 