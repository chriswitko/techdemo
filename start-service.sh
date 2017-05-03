#!/usr/bin/env bash

docker service create --replicas 1 --name techspeller-service -l=apiRoute='/' -p 3000:3000 chris/techspeller-service
