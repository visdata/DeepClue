#!/bin/bash
#if [ -e ../1.bloomberg_titles+company/zkb-head-to-quit-over-sulzer-stock-options-tages-anzeiger-says.1 ]; then
#if [ -e "../1.bloomberg_titles+company/*.1" ]; then
files=$(ls ../1.bloomberg_titles+company/*.1 2> /dev/null | wc -l)
if [ "$files" != "0" ] ; then
    echo "hello"
else
    echo "world"
fi
