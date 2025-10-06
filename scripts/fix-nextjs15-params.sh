#!/bin/bash

# Fix Next.js 15 params issue in all remaining client component pages with dynamic routes
# This script adds React's use() hook and updates params handling

# List of files to fix (already fixed 3, need to fix 6 more)
files=(
  "app/admin/users/[id]/page.tsx"
  "app/partner/orders/[id]/quote/page.tsx"
  "app/partner/orders/[id]/page.tsx"
  "app/orders/[id]/pay/page.tsx"
  "app/orders/[id]/page.tsx"
  "app/orders/recurring/[id]/page.tsx"
)

echo "🔧 Fixing Next.js 15 params handling in ${#files[@]} files..."
echo ""

for file in "${files[@]}"; do
  if [ ! -f "$file" ]; then
    echo "❌ File not found: $file"
    continue
  fi
  
  echo "Processing: $file"
  
  # Check if already has 'use' import from react
  if grep -q "import.*{ use" "$file"; then
    echo "  ✓ Already has use() import"
  else
    # Add use to the imports from react
    sed -i.bak "s/from 'react'/from 'react'; import { use } from 'react'/" "$file"
    sed -i.bak "s/import { \(.*\) } from 'react'/import { use, \1 } from 'react'/" "$file"
    echo "  ✓ Added use() import"
  fi
  
  # Update the params type from { id: string } to Promise<{ id: string }>
  sed -i.bak "s/params: { id: string }/params: Promise<{ id: string }>/" "$file"
  echo "  ✓ Updated params type"
  
  # Check if params is already destructured with use()
  if grep -q "const { id } = use(params)" "$file"; then
    echo "  ✓ Already using use() hook"
  else
    # Add const { id } = use(params); after the function declaration
    # This is tricky, need to handle different function styles
    echo "  ⚠️  Manual verification needed for use() hook addition"
  fi
  
  # Clean up backup files
  rm -f "$file.bak"
  
  echo ""
done

echo "✅ Script complete! Please verify the changes and run npm run build"
