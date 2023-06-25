@ECHO OFF
:: This is a build script for webpack/UMD based build.

ECHO Initiating webpack build sequence.

call webpack

:: Script copied to dist/ekyc-tools.min.js
:: Fork content of 'webpack_append_data.js' to final js file to
:: make classes global to be backwards compatible.
type scripts\webpack_append_data.js >> dist\ekyc-tools.min.js

ECHO Webpack building done.