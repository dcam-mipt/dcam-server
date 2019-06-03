#!/bin/bash
SSH_SERVER=104.248.28.15
scp -r ./parse/* root@$SSH_SERVER:~/parse
scp -r ./scripts/* root@$SSH_SERVER:~/scripts
ssh root@$SSH_SERVER sh << END
	# pm2 restart all
	pm2 kill
	pm2 start ./scripts/ecosystem_parse.json
	pm2 start ./scripts/ecosystem.json
END

printf "\n\n\n> > > git commit (back) < < <\n\n\n"
git add .
git status -s
git commit -m `date '+%d.%m.%Y🌿%H:%M'`
git push