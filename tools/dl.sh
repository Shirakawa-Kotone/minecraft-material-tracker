#!/bin/bash
item=$1
wname=$2
file="images/${item}.png"
[ -f "$file" ] && exit 0
curl -s -o "$file" \
  -H "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36" \
  -H "Accept: image/*" \
  -H "Referer: https://minecraft.wiki/" \
  --connect-timeout 8 --max-time 15 \
  "https://minecraft.wiki/images/Invicon_${wname}.png" 2>/dev/null
sz=$(stat -f%z "$file" 2>/dev/null || echo 0)
if [ "$sz" -lt 50 ]; then rm -f "$file"; fi
