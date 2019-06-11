#!/bin/bash
mongodump
zip -r backup_$(date +%s) dump
rm -rf dump