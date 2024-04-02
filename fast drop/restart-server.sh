#!/bin/bash

# Running this terminates all running node processes, 
# checks if there's a screen named 'app' running,
# and starts the server on that screen

# find and kill nodejs
if pidof nodejs; then
	sudo kill -9 $(pidof nodejs);
fi

# kill screen "app"
screen -S app -X stuff "sudo nodejs app.js"
