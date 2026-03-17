#!/bin/bash
mkdir -p example/remote example/src
git -C example/remote init --bare
git -C example/src init
git -C example/src config user.name "CI Bot"
git -C example/src config user.email "ci@vibe-model.local"
echo "# Test" > example/src/README.md
git -C example/src add README.md
git -C example/src commit -m "Initial commit"
git -C example/src remote add origin ../remote
git -C example/src push -u origin main