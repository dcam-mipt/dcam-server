#!/bin/bash
SSH_SERVER=dcam.pro
scp -r ./* root@$SSH_SERVER:~/
# ssh root@$SSH_SERVER sh << END
#         pm2 restart all
# END