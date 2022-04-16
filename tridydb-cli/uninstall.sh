#!/bin/bash

if [ $EUID -eq 0 ]; then
    unlink "/usr/local/bin/tridydb";
else
    unlink "$HOME/.local/bin/tridydb";
fi

echo "> TridyDB was successfully uninstalled."
echo;
