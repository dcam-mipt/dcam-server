#!/bin/bash

SSH_HOST=root@dcam.pro
SERVERNAME=http://dcam.pro:1337
response=$(curl --write-out %{http_code} --silent --output /dev/null $SERVERNAME)
echo $response

if [[ "$response" -ne 200 ]] ; then
  echo "fail!"

docker restart dcam_parse_server

else
  exit 0
fi