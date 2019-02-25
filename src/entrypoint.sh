#!/bin/sh -l

npm --prefix /action install /action
node /action/notify.js
