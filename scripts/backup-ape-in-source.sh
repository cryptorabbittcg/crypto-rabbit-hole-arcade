#!/bin/bash
# Backup script for ape-in-source folder before removal

set -e

BACKUP_DIR="/home/apedev/crypto-rabbit-hole-arcade"
SOURCE_DIR="$BACKUP_DIR/features/games/ape-in-source"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_FILE="ape-in-source-backup-${TIMESTAMP}.tar.gz"

echo "📦 Creating backup of ape-in-source folder..."
echo ""

# Check if source exists
if [ ! -d "$SOURCE_DIR" ]; then
    echo "⚠️  Source directory does not exist: $SOURCE_DIR"
    exit 1
fi

# Calculate size
SIZE=$(du -sh "$SOURCE_DIR" | cut -f1)
echo "Source directory size: $SIZE"
echo ""

# Create backup
cd "$BACKUP_DIR"
tar -czf "$BACKUP_FILE" features/games/ape-in-source/

# Verify backup
if [ -f "$BACKUP_FILE" ]; then
    BACKUP_SIZE=$(du -sh "$BACKUP_FILE" | cut -f1)
    echo "✅ Backup created successfully!"
    echo ""
    echo "Backup file: $BACKUP_FILE"
    echo "Backup size: $BACKUP_SIZE"
    echo "Location: $BACKUP_DIR/$BACKUP_FILE"
    echo ""
    echo "To verify backup contents:"
    echo "  tar -tzf $BACKUP_FILE | head -20"
    echo ""
    echo "To extract backup:"
    echo "  tar -xzf $BACKUP_FILE"
    echo ""
    
    # Show backup location
    ABSOLUTE_PATH=$(realpath "$BACKUP_FILE")
    echo "Absolute path: $ABSOLUTE_PATH"
else
    echo "❌ Backup failed!"
    exit 1
fi

