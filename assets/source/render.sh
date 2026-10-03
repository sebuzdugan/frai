#!/bin/bash
# usage: render.sh file.html [w h]
f="$1"; w=${2:-1600}; h=${3:-900}
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --disable-gpu --hide-scrollbars --allow-file-access-from-files --force-device-scale-factor=2 --window-size=$w,$h --virtual-time-budget=6000 --screenshot="${f%.html}.png" "file://$PWD/$f" 2>/dev/null
echo "rendered ${f%.html}.png"
