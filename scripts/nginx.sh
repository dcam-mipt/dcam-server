#!/usr/bin/env bash

DOMAIN_NAME=dcam.pro
USER='root'

sudo mkdir -p /var/www/$DOMAIN_NAME/html
sudo chown -R $USER:$USER /var/www/$DOMAIN_NAME/html
sudo chmod -R 755 /var/www/$DOMAIN_NAME

cat > /var/www/$DOMAIN_NAME/html/index.html <<EOF
<html>
    <head>
        <title>Welcome to Example.com!</title>
    </head>
    <body>
        <h1>Success!  The $DOMAIN_NAME server block is working!</h1>
    </body>
</html>
EOF

cat > /etc/nginx/sites-available/$DOMAIN_NAME <<EOF
server {
    listen 80;
    server_name dashboard.$DOMAIN_NAME;

    location / {
        proxy_pass http://localhost:4040/;
    }
}

server {
    listen 80;
    server_name parse.$DOMAIN_NAME;

    location / {
        proxy_pass http://localhost:1337/parse/;
    }
}

server {

        listen 80;
        server_name $DOMAIN_NAME www.$DOMAIN_NAME;

        location /api/ {
            add_header "Access-Control-Allow-Headers" "Authorization, Origin, X-Requested-With, Content-Type, Accept";
            proxy_pass http://localhost:8080/;
        }

        location / {
                root /var/www/$DOMAIN_NAME/html;
        }

}

server {
    listen 80;

    root /var/www/alpha;
    index index.html index.htm index.nginx-debian.html;

    server_name alpha.$DOMAIN_NAME www.alpha.$DOMAIN_NAME;

    location / {
        try_files $uri $uri/ =404;
    }
}

server {
    listen 80;

    root /var/www/beta;
    index index.html index.htm index.nginx-debian.html;

    server_name beta.$DOMAIN_NAME www.beta.$DOMAIN_NAME;

    location / {
        try_files $uri $uri/ =404;
    }
}
EOF

rm -rf /etc/nginx/sites-enabled/$DOMAIN_NAME
sudo ln -s /etc/nginx/sites-available/$DOMAIN_NAME /etc/nginx/sites-enabled/
# sudo nginx -t
sudo systemctl restart nginx