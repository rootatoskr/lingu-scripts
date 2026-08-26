#!/bin/sh
# ~/.config/sway/scripts/mouse_jiggle.sh
# Randomly nudges the cursor every few seconds to prevent idle/lock. Ctrl+C to stop.

while true; do
    dx=$(( (RANDOM % 21) - 10 ))
    dy=$(( (RANDOM % 21) - 10 ))
    swaymsg "seat seat0 cursor move $dx $dy" > /dev/null
    sleep "$(( (RANDOM % 4) + 2 ))"
done
