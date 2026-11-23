#!/bin/sh
# Copies the extension and lets it also run on the local mock page (the real manifest only targets web.whatsapp.com).
set -e
rm -rf ../testbuild && cp -r ../extension ../testbuild
node -e '
const fs=require("fs");const p="../testbuild/manifest.json";const m=JSON.parse(fs.readFileSync(p));
m.content_scripts.forEach(c=>c.matches.push("http://localhost:8099/*"));m.host_permissions.push("http://localhost:8099/*");
fs.writeFileSync(p,JSON.stringify(m,null,2));'
