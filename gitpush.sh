#!/bin/bash

# 1. In jedem Submodule: Branch wechseln, adden, committen
git submodule foreach '
  git checkout main || git checkout master;
  git add .;
  if ! git diff-index --quiet HEAD; then
    git commit -m "Automatisches Submodule Update";
  fi
'

# 2. Im Haupt-Repository: Alles adden und committen
git add .
if ! git diff-index --quiet HEAD; then
  git commit -m "Main Repo Update inkl. Submodules"
fi

# 3. Alles pushen (inklusive der Submodule-Commits)
git push --recurse-submodules=on-demand
