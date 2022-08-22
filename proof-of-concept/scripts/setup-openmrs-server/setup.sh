#!/bin/bash

#
cd "$PAYLOADS"

#
env_database="$DB_SERVER_DC_IPV4_1"
env_passwd_mysql_openmrs_user="$PASSWD_MYSQL_OPENMRS_USER"

#
tomcat_common_1="tomcat8"
tomcat_user="$tomcat_common_1"
tomcat_service="$tomcat_common_1.service"
tomcat_install_dir="/opt/$tomcat_common_1"
openmrs_install_dir="$tomcat_install_dir/webapps/openmrs"
openmrs_home_dir="/var/lib/OpenMRS"
openmrs_archive="openmrs.tar.gz"

#
tar -xzf "$openmrs_archive" -C "/"
chown -R "$tomcat_user:$tomcat_user" "$openmrs_install_dir"
chown -R "$tomcat_user:$tomcat_user" "$openmrs_home_dir"

#
config="$openmrs_home_dir/openmrs-runtime.properties"
cat > "$config" << EOF
encryption.vector=GGyROys5mJeZRjRTQj8QKQ\=\=
connection.url=jdbc\:mysql\://$env_database\:3306/openmrs?autoReconnect\=true&sessionVariables\=default_storage_engine\=InnoDB&useUnicode\=true&characterEncoding\=UTF-8&useSSL\=false
module.allow_web_admin=true
connection.username=openmrs_user
auto_update_database=false
encryption.key=+JPdmU3ZSAHO9SUFvyavjQ\=\=
connection.password=$env_passwd_mysql_openmrs_user
EOF
chmod 600 "$config"

#
until mysqladmin -u "openmrs_user" --password="$env_passwd_mysql_openmrs_user" -h "$env_database" ping; do
	sleep 1
done

#
systemctl restart "$tomcat_service"
