#!/bin/bash

cd "$(dirname "$(realpath "$0")")"

node ../src/app.js $@
