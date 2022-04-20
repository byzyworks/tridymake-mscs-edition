#!/bin/bash

node "$(dirname "$(realpath "$0")")/../src/app.js" $@
