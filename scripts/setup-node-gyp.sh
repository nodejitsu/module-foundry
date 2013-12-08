#!/usr/bin/env bash

#
# Install `node-gyp@0.6.10` to install the relevant source
# files for `node@0.6.21`
#
npm install -g node-gyp@0.6.10
node-gyp install 0.6.21

npm install -g node-gyp@latest
node-gyp install 0.10.22
node-gyp install 0.8.26

