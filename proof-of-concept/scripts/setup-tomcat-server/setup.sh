#!/bin/bash

#
cd "$PAYLOADS"

#
env_database="$DB_SERVER_DC_IPV4_1"
env_passwd_tomcat_admin="$PASSWD_TOMCAT_ADMIN"

#
tomcat_common_1="tomcat8"
tomcat_common_2="apache-tomcat-8.5.60"
tomcat_user="$tomcat_common_1"
tomcat_service="$tomcat_common_1.service"
tomcat_file="$tomcat_common_2.tar.gz"
tomcat_download="https://downloads.apache.org/tomcat/tomcat-8/v8.5.60/bin/$tomcat_file"
tomcat_extract="$tomcat_common_2"
tomcat_install_dir="/opt/$tomcat_common_1"

#
apt install -y "unzip" "mysql-client" "openjdk-8-jdk"

#
useradd -U "$tomcat_user" -s "/usr/sbin/nologin"

#
if [ ! -f "$tomcat_file" ]; then
	wget "$tomcat_download" -O "$tomcat_file"
fi
tar -xzf "$tomcat_file"
mv "$tomcat_extract" "$tomcat_install_dir"
chown -R "$tomcat_user:$tomcat_user" "$tomcat_install_dir"

#
cat > "/etc/systemd/system/$tomcat_service" << EOF
[Unit]
Description=Apache Tomcat Java Web Application Servlet Container
After=syslog.target network.target

[Service]
Type=forking

User=$tomcat_user
Group=$tomcat_user

Environment="JAVA_HOME=/usr/lib/jvm/java-1.8.0-openjdk-amd64"
Environment="JRE_HOME=/usr/lib/jvm/java-1.8.0-openjdk-amd64/jre"
Environment="JAVA_OPTS=-Djava.awt.headless=true -Djava.security.egd=file:///dev/urandom"
Environment="CATALINA_PID=$tomcat_install_dir/tomcat.pid"
Environment="CATALINA_BASE=$tomcat_install_dir"
Environment="CATALINA_HOME=$tomcat_install_dir"
Environment="CATALINA_OPTS=-Xms512M -Xmx1024M -XX:PermSize=256m -XX:MaxPermSize=256m -XX:NewSize=128m -server -XX:+UseParallelGC"

ExecStartPre=/bin/sh -c "while ! mysqladmin ping -h"$env_database" --silent; do sleep 5; done"
ExecStart=$tomcat_install_dir/bin/startup.sh
ExecReload=$tomcat_install_dir/bin/shutdown.sh
ExecStop=$tomcat_install_dir/bin/shutdown.sh

SyslogIdentifier=$tomcat_common_1

[Install]
WantedBy=multi-user.target
EOF

#
config="$tomcat_install_dir/conf/tomcat-users.xml"
sed -i '$ d' "$config"
cat >> "$config" << EOF
<role rolename="tomcat"/>
<role rolename="admin"/>
<role rolename="admin-gui"/>
<role rolename="manager"/>
<role rolename="manager-gui"/>
<user username="admin" password="$env_passwd_tomcat_admin" roles="tomcat,admin,admin-gui,manager,manager-gui"/>
</tomcat-users>
EOF

#
config="$tomcat_install_dir/webapps/manager/WEB-INF/web.xml"
sed -i "s@<!-- 50MB max -->@<!-- 250MB max -->@" "$config"
sed -i "s@<max-file-size>52428800</max-file-size>@<max-file-size>262144000</max-file-size>@" "$config"
sed -i "s@<max-request-size>52428800</max-request-size>@<max-request-size>262144000</max-request-size>@" "$config"

#
systemctl enable "$tomcat_service" --now

#
ufw allow "8080/tcp"
