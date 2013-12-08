#!/usr/bin/env bash

PKGS="openssl python27 cairo pkg-config"

#
# This only gets better when lots of people build lots
# of modules with it
#
echo "Installing known dependencies for binary modules: $PKGS"
echo ""
echo "Ubuntu users: We need your help making this script better!"
echo "Add missing dependencies for binary modules: https://github.com/nodejitsu/module-foundry"

#
# Install all of the necessary requirements to build packages
#
apt-get -y install $PKGS