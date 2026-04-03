#!/bin/env bash
set -e

PROMPT="$1"

if ! command -v claude &> /dev/null; then
    echo "Error: claude command not found"
    exit 1
fi

claude -p "$PROMPT"