#!/bin/bash

cairo-compile $1 --output $1.json

# firefox "http://localhost:8100" # open the debugger
cairo-run --program=$1.json --print_output --layout=small --program_input=$2 --tracer
