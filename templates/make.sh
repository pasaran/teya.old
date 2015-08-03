#!/bin/sh

../node_modules/.bin/babel *.js --plugins ./lib/babel-plugin-template-literals.js -d compiled/

