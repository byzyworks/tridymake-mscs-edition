#!/bin/bash

#
cd "$PAYLOADS"

#
env_app_server="$APP_SERVER_DC_IPV4_1"
env_passwd_mysql_root="$PASSWD_MYSQL_ROOT"
env_passwd_openmrs_admin="$PASSWD_OPENMRS_ADMIN"
env_passwd_mysql_openmrs_user="$PASSWD_MYSQL_OPENMRS_USER"

#
mysql -u "root" --password="$env_passwd_mysql_root" -e "\
CREATE DATABASE openmrs;\
CREATE USER 'openmrs_user'@'$env_app_server' IDENTIFIED WITH mysql_native_password BY '$env_passwd_mysql_openmrs_user';\
GRANT ALL PRIVILEGES ON openmrs.* TO 'openmrs_user'@'$env_app_server';\
FLUSH PRIVILEGES;"

#
database="openmrs.sql"
gzip -dk "$database.gz"
mysql -u "root" --password="$env_passwd_mysql_root" "openmrs" < "$database"

#
salt="$(mysql -u "root" --password="$env_passwd_mysql_root" -se "\
USE openmrs;\
SELECT salt FROM users WHERE username='admin';")"
mysql -u "root" --password="$env_passwd_mysql_root" -e "\
USE openmrs;\
UPDATE users SET password='$(printf "$env_passwd_openmrs_admin$salt" | sha512sum | head -c 128)' WHERE username='admin';"
