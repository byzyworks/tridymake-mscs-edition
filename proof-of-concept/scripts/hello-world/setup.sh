#!/bin/bash

#
env_user_name="$SYSTEM_USER"
env_welcome="$WELCOME_MESSAGE"

#
user_home=$(getent passwd "$env_user_name" | cut -d: -f6)
echo "echo \"$env_welcome\"" >> "$user_home/.bashrc"
echo "echo `cat message2.txt`" >> "$user_home/.bashrc"