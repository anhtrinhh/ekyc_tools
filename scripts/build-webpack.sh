#!/bin/bash
## Build Script
echo 'Initiating webpack build sequence.'

export NODE_OPTIONS=--openssl-legacy-provider

webpack

## Script copied to dist/ekyc-tools.min.js
## Fork content of 'webpack_append_data.js' to final js file to
## make classes global to be backwards compatible.
cat scripts/webpack_append_data.js >> dist/ekyc-tools.min.js

echo 'Webpack building done.'