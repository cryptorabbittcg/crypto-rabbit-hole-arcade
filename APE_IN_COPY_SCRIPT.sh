#!/bin/bash
# Script to copy Ape In game source files (excluding build artifacts)

# SOURCE: Path to your ape-in-game source directory
# TARGET: Path to arcade hub (this repo)
SOURCE_DIR="/path/to/ape-in-game"  # UPDATE THIS PATH
TARGET_DIR="/home/apedev/crypto-rabbit-hole-arcade/features/games/ape-in-source"

# Create target directory
mkdir -p "$TARGET_DIR"

echo "📁 Copying Ape In source files..."
echo "Source: $SOURCE_DIR"
echo "Target: $TARGET_DIR"

# Copy everything EXCEPT:
# - node_modules
# - Build folders (.next, dist, build, out)
# - Git folder
# - Cache folders (.cache, .turbo, .swc)
# - Environment files (.env*)
# - Lock files (package-lock.json, yarn.lock, pnpm-lock.yaml)
# - IDE config (.vscode, .idea)
# - OS files (.DS_Store, Thumbs.db)

rsync -av \
  --exclude 'node_modules' \
  --exclude '.next' \
  --exclude 'dist' \
  --exclude 'build' \
  --exclude 'out' \
  --exclude '.git' \
  --exclude '.cache' \
  --exclude '.turbo' \
  --exclude '.swc' \
  --exclude '.env*' \
  --exclude 'package-lock.json' \
  --exclude 'yarn.lock' \
  --exclude 'pnpm-lock.yaml' \
  --exclude '.vscode' \
  --exclude '.idea' \
  --exclude '.DS_Store' \
  --exclude 'Thumbs.db' \
  --exclude '*.log' \
  --exclude '.vercel' \
  --exclude '.netlify' \
  "$SOURCE_DIR/" "$TARGET_DIR/"

echo "✅ Copy complete!"
echo ""
echo "📊 Analyzing structure..."
find "$TARGET_DIR" -type f | wc -l | xargs echo "Total files:"
find "$TARGET_DIR" -type d | wc -l | xargs echo "Total directories:"
echo ""
echo "📋 Next step: Review the structure, then I'll reorganize it properly"

