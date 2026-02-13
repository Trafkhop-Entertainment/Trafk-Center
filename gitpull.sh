#!/bin/bash

# 1. Hauptprojekt ziehen
git pull origin main

# 2. Submodule aktualisieren und initialisieren
git submodule update --init --recursive

# 3. Jedes Submodule auf den richtigen Branch bringen
git submodule foreach 'git checkout main || git checkout master && git pull origin main'
