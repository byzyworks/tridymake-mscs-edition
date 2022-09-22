#!/bin/bash

#
perl -i -pe "s/\tlisten 443 ssl;\n//g" "/etc/nginx/sites-available/openmrs"

#
systemctl restart "nginx"
