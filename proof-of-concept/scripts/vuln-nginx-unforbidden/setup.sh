#!/bin/bash

#
config="/etc/nginx/sites-available/openmrs"
perl -i -0pe "s/\n\s+location = \/ \{[^}]*\}/\n/gms" "$config"
perl -i -0pe "s/\n\s+location \/ \{[^}]*\}\n//gms"   "$config"
perl -i -pe  "s/openmrs\///g"                        "$config"

#
systemctl restart "nginx"
