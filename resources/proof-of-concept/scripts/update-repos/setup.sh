#!/bin/bash

if [ -f "/etc/debian_version" ]; then
	apt update && apt upgrade -y
elif [ -f "/etc/redhat-release" ]; then
	dnf update -y
elif [ -f "/etc/SuSe-release" ]; then
	zypper up -n
elif [ -f "/etc/arch-release" ]; then
	pacman -Syu --noconfirm
fi
