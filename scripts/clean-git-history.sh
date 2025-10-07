#!/bin/bash

# Git History Cleanup Script for .env.production
# This script removes the .env.production file from ALL git history
# WARNING: This will rewrite git history and require force push

set -e

echo "🚨 WARNING: This script will rewrite git history!"
echo "This is NECESSARY to completely remove the exposed API key from GitHub."
echo ""
echo "After running this script, you MUST:"
echo "1. Force push to GitHub: git push origin --force --all"
echo "2. Notify any collaborators to re-clone the repository"
echo ""
read -p "Continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Aborted."
    exit 1
fi

echo ""
echo "📋 Backing up current branch..."
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
git branch backup-before-history-cleanup-$(date +%Y%m%d-%H%M%S)

echo ""
echo "🔍 Checking for .env.production in git history..."
if git log --all --full-history -- .env.production | grep -q commit; then
    echo "✅ Found .env.production in history. Proceeding with removal..."
else
    echo "❌ .env.production not found in history. Nothing to clean."
    exit 0
fi

echo ""
echo "🧹 Removing .env.production from all git history..."
git filter-branch --force --index-filter \
    'git rm --cached --ignore-unmatch .env.production' \
    --prune-empty --tag-name-filter cat -- --all

echo ""
echo "🗑️  Cleaning up refs and garbage collection..."
rm -rf .git/refs/original/
git reflog expire --expire=now --all
git gc --prune=now --aggressive

echo ""
echo "✅ Git history cleanup complete!"
echo ""
echo "📤 Next steps:"
echo "1. Verify the file is gone from history: git log --all --full-history -- .env.production"
echo "2. Force push to remote: git push origin --force --all"
echo "3. Force push tags: git push origin --force --tags"
echo ""
echo "⚠️  IMPORTANT: After force pushing:"
echo "   - All collaborators must re-clone the repository"
echo "   - Any open pull requests will need to be recreated"
echo "   - CI/CD pipelines may need to be re-triggered"
