#!/bin/bash
git add .
git status -s
git commit -m `date '+%d.%m.%Y🌿%H:%M'`
git push

scp -r ./jobs/* root@dcam.pro:~/jobs
ssh root@dcam.pro sh << END
	# pm2 kill
	# pm2 start ~/jobs/rest.js
	# pm2 start ~/jobs/server_time.js
	pm2 restart all
	# pm2 logs
END