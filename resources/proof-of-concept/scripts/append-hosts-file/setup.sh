#!/bin/bash

#
env_app_server_ip="$WWW_SERVER_DMZ_IPV4_1"
env_web_server_hostname="$WWW_SERVER_HOSTNAME"
env_web_server_hostname_alias="$DOMAIN"

#
cat >> "/etc/hosts" << EOF
$env_app_server_ip $env_web_server_hostname $env_web_server_hostname_alias
EOF
