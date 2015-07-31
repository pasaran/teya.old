#!/bin/sh

../node_modules/.bin/babel *.js --plugins ./babel-plugin/template-literals.js -d compiled/

