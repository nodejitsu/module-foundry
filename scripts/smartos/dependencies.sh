#!/usr/bin/env bash

PKGS="gcc-compiler gmake openssl python27 gd cairo pkg-config xproto \
renderproto kbproto jpeg png giflib ImageMagick GraphicsMagick zip unzip bzip2 \
gzip libxml2 GeoIP-1.4.8 gmp icu postgresql91-client ffmpeg"

#
# This only gets better when lots of people build lots
# of modules with it
#
echo "Installing known dependencies for binary modules: $PKGS"
echo ""
echo "SmartOS users: We need your help making this script better!"
echo "Add missing dependencies for binary modules: https://github.com/nodejitsu/module-foundry"
exit 1

#
# Install all of the necessary requirements to build packages
#
pkgin -y install $PKGS