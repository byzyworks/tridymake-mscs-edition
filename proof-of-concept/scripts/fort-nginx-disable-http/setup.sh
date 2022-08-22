#!/bin/bash

#
perl -i -pe "s/\tlisten 80;\n//g" "/etc/nginx/sites-available/openmrs"

#
systemctl restart "nginx"
