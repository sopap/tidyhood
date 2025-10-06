#!/bin/bash

# Fix Next.js 15 async params in API routes
# API routes need to await params, not use React's use() hook

files=(
  "app/api/admin/partners/[id]/route.ts"
  "app/api/admin/users/[id]/route.ts"
  "app/api/admin/orders/[id]/notes/route.ts"
  "app/api/admin/orders/[id]/force-status/route.ts"
  "app/api/admin/orders/[id]/refund/route.ts"
  "app/api/partner/orders/[id]/quote/route.ts"
  "app/api/partner/orders/[id]/status/route.ts"
  "app/api/partner/orders/[id]/route.ts"
  "app/api/partners/[id]/route.ts"
  "app/api/orders/[id]/cancel/route.ts"
  "app/api/orders/[id]/transition/route.ts"
  "app/api/orders/[id]/pay/route.ts"
  "app/api/orders/[id]/route.ts"
  "app/api/orders/[id]/reschedule/route.ts"
  "app/api/recurring/plan/[id]/route.ts"
)

echo "🔧 Fixing Next.js 15 async params in ${#files[@]} API route files..."
echo ""

for file in "${files[@]}"; do
  if [ ! -f "$file" ]; then
    echo "❌ File not found: $file"
    continue
  fi
  
  echo "Processing: $file"
  
  # Step 1: Change params type from { id: string } to Promise<{ id: string }>
  sed -i.bak 's/{ params }: { params: { id: string } }/{ params }: { params: Promise<{ id: string }> }/g' "$file"
  
  # Step 2: Change all "const { id } = params;" to "const { id } = await params;"
  sed -i.bak 's/const { id } = params;/const { id } = await params;/g' "$file"
  
  # Clean up backup files
  rm -f "$file.bak"
  
  echo "  ✓ Updated params handling"
  echo ""
done

echo "✅ All API routes fixed! Run 'npm run build' to verify."
