#!/bin/bash

RIG=$1
ACTION=$2
if [ "$RIG" = "" ]; then
    echo "RIG COULD NOT BE NULL"
    exit 1
fi

if [ "$ACTION" = "" ]; then
    echo "ACTION COULD NOT BE NULL"
    exit 1
fi

HEADER="Authorization: Basic "
PORT="3000"
URL="http://localhost:$PORT/api/rigs/$RIG/"
METHOD="POST"

if [ "$ACTION" = "offline" ] || [ "$ACTION" = "online" ]; then
    curl -X $METHOD -H "$HEADER" "$URL$ACTION"
fi

if [ "$ACTION" = "startup" ] || [ "$ACTION" = "shutdown" ] || [ "$ACTION" = "reset" ]; then
    echo "offline at first:"
    curl -X $METHOD -H "$HEADER" "${URL}offline"
    echo
    echo "perform $ACTION"
    curl -X $METHOD -H "$HEADER" "$URL$ACTION"
fi
