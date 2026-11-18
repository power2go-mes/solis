#!/usr/bin/env sh
set -e

cd /app

node -e '
const fs = require("fs");
const o = JSON.parse(fs.readFileSync("/data/options.json", "utf8"));
const lines = [
  "solis.url = https://www.soliscloud.com",
  "solis.username = " + (o.solis_username || ""),
  "solis.password = " + (o.solis_password || ""),
  "service.port = " + (o.service_port || 5561),
  "service.username = " + (o.service_username || "solis"),
  "service.password = " + (o.service_password || "changeme")
];
fs.writeFileSync("/app/scraper.properties", lines.join("\n") + "\n");
console.log("Config written. Starting scraper...");
'

exec node scraper.js
