#!/bin/bash
# Check that treasury address is not hardcoded in client code
# This ensures security: treasury address must only exist server-side

TREASURY_ADDRESS="0xae998cc1128974381008ad086828c9b606b00c0f"
CLIENT_DIRS=("features" "components")

echo "Checking for treasury address in client code..."

FOUND=0

for dir in "${CLIENT_DIRS[@]}"; do
  if [ -d "$dir" ]; then
    # Search for treasury address in client directories
    if grep -r "$TREASURY_ADDRESS" "$dir" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" 2>/dev/null; then
      echo "ERROR: Treasury address found in client code: $dir"
      FOUND=1
    fi
  fi
done

if [ $FOUND -eq 1 ]; then
  echo ""
  echo "❌ FAILED: Treasury address must NOT be hardcoded in client code"
  echo "Treasury address must only exist server-side (lib/, app/api/, supabase/migrations/)"
  exit 1
fi

echo "✅ PASSED: Treasury address not found in client code"
exit 0
