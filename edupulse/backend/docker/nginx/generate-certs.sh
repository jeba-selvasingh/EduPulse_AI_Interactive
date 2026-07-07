#!/bin/sh
set -e
DIR="$(cd "$(dirname "$0")" && pwd)/certs"
mkdir -p "$DIR"

if [ ! -f "$DIR/cert.pem" ]; then
  openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout "$DIR/key.pem" \
    -out "$DIR/cert.pem" \
    -subj "/CN=edupulse.local/O=PES University"
  echo "Generated $DIR/cert.pem"
fi
