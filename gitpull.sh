#!/bin/bash

git pull origin main

git submodule update --init --recursive

git submodule foreach 'git checkout main || git checkout master && git pull origin main'
