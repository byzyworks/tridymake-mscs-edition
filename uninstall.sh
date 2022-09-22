#!/bin/bash

if [ $EUID -eq 0 ]; then
    unlink "/usr/local/bin/tridymake";
else
    unlink "$HOME/.local/bin/tridymake";
fi

echo "> Tridymake was successfully uninstalled."
echo;
