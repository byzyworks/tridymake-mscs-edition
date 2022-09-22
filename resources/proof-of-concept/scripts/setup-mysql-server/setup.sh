#!/bin/bash

#
cd "$PAYLOADS"

#
env_passwd_mysql_root="$PASSWD_MYSQL_ROOT"

#
mysql_file="mysql-server_5.7.32-1ubuntu18.04_amd64.deb-bundle.tar"
mysql_download="https://dev.mysql.com/get/Downloads/MySQL-5.7/$mysql_file"

#
if [ ! -f "$mysql_file" ]; then
	wget "$mysql_download" -O "$mysql_file"
fi
tar -xf "$mysql_file"

#
debconf-set-selections <<< "mysql-community-server mysql-community-server/root-pass password $env_passwd_mysql_root"
debconf-set-selections <<< "mysql-community-server mysql-community-server/re-root-pass password $env_passwd_mysql_root"

#
apt install -y "libtinfo5" "libmecab2" "libaio1"

#
dpkg -i "mysql-common_5.7.32-1ubuntu18.04_amd64.deb"
dpkg -i "mysql-community-client_5.7.32-1ubuntu18.04_amd64.deb"
dpkg -i "mysql-client_5.7.32-1ubuntu18.04_amd64.deb"
dpkg -i "mysql-community-server_5.7.32-1ubuntu18.04_amd64.deb"

#
systemctl enable "mysql" --now

#
mysql -u "root" --password="$env_passwd_mysql_root" -e "\
USE mysql;\
UPDATE user SET plugin='mysql_native_password', authentication_string=PASSWORD('$env_passwd_mysql_root') WHERE user='root';\
DELETE FROM user WHERE user='root' AND host NOT IN ('localhost', '127.0.0.1', '::1');\
DELETE FROM user WHERE user='';\
DROP DATABASE IF EXISTS test;\
DELETE FROM db WHERE db='test' OR db='test\_%';\
FLUSH PRIVILEGES;"
if [ "$?" -ne "0" ]; then
	echo ": Password was incorrect."
	exit 1
fi

#
config="/etc/mysql/mysql.conf.d/mysqld.cnf"
sed -i "s/bind-address	= 127.0.0.1/bind-address	= 0.0.0.0/" "$config"

#
cat >> "/etc/mysql/my.cnf" << EOF

[mysqld]
skip_name_resolve=ON
EOF

#
systemctl restart "mysql"

#
ufw allow "3306/tcp"
