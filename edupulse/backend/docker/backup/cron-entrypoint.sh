#!/bin/sh
# Runs backup.sh daily at 02:00 UTC inside the compose stack
set -e
apk add --no-cache postgresql-client curl >/dev/null
curl -fsSL "https://dl.min.io/client/mc/release/linux-amd64/mc" -o /usr/local/bin/mc
chmod +x /usr/local/bin/mc
echo "0 2 * * * /backup/backup.sh >> /var/log/backup.log 2>&1" | crontab -
crond -f -l 2
