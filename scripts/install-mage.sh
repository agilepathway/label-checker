#!/bin/bash

cd /tmp || exit
git clone https://github.com/magefile/mage
cd mage || exit
go run bootstrap.go
