#!/bin/bash

#
env_passwd_mysql_root="$PASSWD_MYSQL_ROOT"
env_passwd_mysql_openmrs_user="$PASSWD_MYSQL_OPENMRS_USER"

#
mysql -u "root" --password="$env_passwd_mysql_root" -e "\
USE mysql;\
CREATE USER 'root'@'%' IDENTIFIED WITH mysql_native_password BY '$env_passwd_mysql_root';\
GRANT ALL PRIVILEGES ON *.* TO 'root'@'%';\
CREATE USER 'openmrs_user'@'%' IDENTIFIED WITH mysql_native_password BY '$env_passwd_mysql_openmrs_user';\
GRANT ALL PRIVILEGES ON openmrs.* TO 'openmrs_user'@'%';\
FLUSH PRIVILEGES;"
