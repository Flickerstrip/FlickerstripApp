#!/bin/bash

src=$1

pid=$PPID
while kill -0 "$pid"; do
    sleep 0.5
done

#Perform update
cp -rf $src/* `pwd`
if [[ "$OSTYPE" == "darwin"* ]]; then
    open ./nwjs.app
else
    ./nw
fi
