#!/bin/bash
SSH_SERVER=dcam.pro
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

    printf '\n\n\n> > > nginx < < <\n\n\n'

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
    echo "deb https://dl.yarnpkg.com/debian/ stable main" | sudo tee /etc/apt/sources.list.d/yarn.list
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

END

printf '\n\n\n> > > copy files to server < < <\n\n\n'
scp -r ./* root@$SSH_SERVER:~/

ssh root@$SSH_SERVER sh << END

    printf '\n\n\n> > > setup nginx server blocks < < <\n\n\n'
    chmod +x ./scripts/nginx.sh
    ./scripts/nginx.sh

    printf '\n\n\n> > > install packages && restart < < <\n\n\n'
    printf '\n> > > parse\n' && cd parse && yarn install && cd ../
    printf '\n> > > scripts\n' && cd scripts && yarn install && cd ../
    printf '\n> > > backup\n' && cd backup && yarn install && cd ../
    
    printf '\n\n\n> > > start pm2 ecosystem < < <\n\n\n'
    pm2 kill
    pm2 start ./scripts/ecosystem.json
    
END