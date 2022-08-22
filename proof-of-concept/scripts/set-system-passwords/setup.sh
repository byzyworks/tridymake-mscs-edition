#!/bin/bash

#
env_root_pass="$PASSWD_SYSTEM_ROOT"
env_user_name="$SYSTEM_USER"
env_user_pass="$PASSWD_SYSTEM_USER"

#
echo "root:$env_root_pass" | chpasswd

#
if ! id "$env_user_name" &>/dev/null; then
	useradd -m -U "$env_user_name" -s "/bin/bash"
fi
echo "$env_user_name:$env_user_pass" | chpasswd
