#!/bin/bash

#
env_passwd_mysql_root="$PASSWD_MYSQL_ROOT"

#
mysql -u "root" --password="$env_passwd_mysql_root" -e "\
USE mysql;\
DELETE FROM user WHERE user='root' AND host NOT IN ('localhost', '127.0.0.1', '::1');\
FLUSH PRIVILEGES;"
if [ "$?" -ne "0" ]; then
	echo ": Password was incorrect."
	exit 1
fi

#
systemctl restart "mysql"
