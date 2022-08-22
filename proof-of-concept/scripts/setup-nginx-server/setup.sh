#!/bin/bash

#
env_hostname="$WWW_SERVER_HOSTNAME"

#
apt install -y "nginx"

#
openssl req -x509 -nodes -days 365 -newkey "rsa:2048" -subj "/C=US/ST=Florida/L=Lakeland/O=Florida Polytechnic University/OU=Department of Computer Science/CN=$env_hostname" -keyout "/etc/ssl/$env_hostname.key" -out "/etc/ssl/$env_hostname.crt"

#
systemctl enable "nginx" --now

#
ufw allow "http"
ufw allow "https"
