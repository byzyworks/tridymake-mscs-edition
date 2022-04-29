#!/bin/bash

here="$(dirname "$(realpath "$0")")"

cd "$here";

echo "> Checking to see if NodeJS is installed...";
if ! node -v >/dev/null 2>&1; then
    echo "> NodeJS does not appear to be installed. NodeJS is required.";
    exit 1;
fi
echo "> NodeJS appears to be installed.";
echo;

echo "> Checking to see if NPM is installed...";
if ! npm -v >/dev/null 2>&1; then
    echo "> NPM does not appear to be installed. NPM is required.";
    exit 1;
fi
echo "> NPM appears to be installed.";
echo;

echo "> Installing required frameworks/libraries...";
npm install;
echo "> Required frameworks/libraries installed.";
echo;

bin="$here/bin";

echo -n "> Would you like to make $bin/tridydb.sh callable from everywhere? [Y/n] ";
read make_shortcut;
echo;
if [ "$make_shortcut" = 'Y' ]; then
    if [ $EUID -eq 0 ]; then
        newbin="/usr/local/bin";
    else
        newbin="$HOME/.local/bin";
    fi
    
    mkdir -p "$newbin";
    ln -sf "$bin/tridydb.sh" "$newbin/tridydb";
fi

echo "> Running a test...";
if ! bin/tridydb.sh inline --file "src/tests/hello-world/test.tri" --pretty; then
    echo "> Uh oh. That wasn't supposed to happen.";
    exit 1;
fi

echo "> Everything looks good.";
echo "> TridyDB was successfully installed."
echo;
