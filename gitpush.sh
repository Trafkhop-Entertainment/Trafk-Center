#!/bin/bash

if [ $# -ge 1 ]; then
  commit_msg="$1"
else
  read -p "Commit Nachricht: " commit_msg
fi

if [ -z "$commit_msg" ]; then
  echo "Fehler: Leer darfs auch nich sein, ja!."
  exit 1
fi

export commit_msg

git submodule foreach '
  git checkout main || git checkout master;
  git add .;
  if ! git diff-index --quiet HEAD; then
    git commit -m "$commit_msg";
  fi
'

git add .
if ! git diff-index --quiet HEAD; then
  git commit -m "$commit_msg"
fi

git push --recurse-submodules=on-demand
