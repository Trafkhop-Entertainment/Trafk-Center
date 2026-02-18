#!/bin/bash

# Commit-Nachricht ermitteln
if [ $# -ge 1 ]; then
  commit_msg="$1"
else
  read -p "Commit-Nachricht eingeben: " commit_msg
fi

# Prüfen, ob eine Nachricht eingegeben wurde (git erlaubt keine leeren Commit-Nachrichten)
if [ -z "$commit_msg" ]; then
  echo "Fehler: Leere Commit-Nachricht ist nicht erlaubt."
  exit 1
fi

export commit_msg

# 1. In jedem Submodul: Branch wechseln, adden, committen (mit der eingegebenen Nachricht)
git submodule foreach '
  git checkout main || git checkout master;
  git add .;
  if ! git diff-index --quiet HEAD; then
    git commit -m "$commit_msg";
  fi
'

# 2. Im Haupt-Repository: Alles adden und committen (mit derselben Nachricht)
git add .
if ! git diff-index --quiet HEAD; then
  git commit -m "$commit_msg"
fi

# 3. Alles pushen (inklusive der Submodule-Commits)
git push --recurse-submodules=on-demand
