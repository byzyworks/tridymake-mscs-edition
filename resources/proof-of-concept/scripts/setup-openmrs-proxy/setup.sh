#!/bin/bash

env_app_server="$APP_SERVER_DC_IPV4_1"
env_web_server_hostname="$WWW_SERVER_HOSTNAME"

#
cat > "/etc/nginx/sites-available/openmrs" << EOF
server {
	listen 80;
	listen 443 ssl;
	
	ssl_certificate /etc/ssl/$env_web_server_hostname.crt;
	ssl_certificate_key /etc/ssl/$env_web_server_hostname.key;
	
	access_log /var/log/nginx/reverse-access.log;
	error_log /var/log/nginx/reverse-error.log;
	
	location = / {
		return 301 /openmrs/;
	}
	location /openmrs/ {
		allow all;
		proxy_pass http://$env_app_server:8080/openmrs/;
	}
	location / {
		deny all;
	}
}
EOF

#
unlink "/etc/nginx/sites-enabled/default"
ln -s "/etc/nginx/sites-available/openmrs" "/etc/nginx/sites-enabled/openmrs"

#
until ping -c 1 "$env_app_server"; do
	sleep 1
done

#
systemctl restart "nginx"
