#!/bin/bash

# ── Script Deployment Dashboard Sa Antar Ko ke GitHub ────────────────────────
# Pastikan Anda sudah login ke GitHub CLI atau punya SSH key configured

set -e  # Exit on error

echo "🏥 Dashboard Sa Antar Ko - Deployment Script"
echo "================================================================"

# 1. Build production
echo "📦 Building production bundle..."
npm run build

# 2. Check if dist/index.html exists
if [ ! -f "dist/index.html" ]; then
    echo "❌ Error: dist/index.html not found after build!"
    exit 1
fi

echo "✅ Build successful! Size: $(du -h dist/index.html | cut -f1)"

# 3. Git initialization
if [ ! -d ".git" ]; then
    echo "🔧 Initializing Git repository..."
    git init
    git branch -M main
fi

# 4. Add remote (if not exists)
if ! git remote | grep -q "origin"; then
    echo "🔗 Adding GitHub remote..."
    git remote add origin https://github.com/rstimpapua21-cmyk/Dashboard-Sa-Antar-Ko.git
fi

# 5. Add all files
echo "📝 Staging all files..."
git add .

# 6. Commit
echo "💾 Committing changes..."
git commit -m "🚀 Production build - Dashboard Sa Antar Ko v1.0

Features:
- SHA-256 encrypted authentication system
- Real-time Google Sheets data integration
- Role-based access control (Admin/Medis/Petugas)
- PII masking for patient data privacy
- Interactive charts & analytics
- Print-ready A4 patient reports
- User management (admin only)
- Audit logging system

Built with: React 19 + TypeScript + Vite + Tailwind CSS"

# 7. Push to GitHub
echo "⬆️  Pushing to GitHub..."
git push -u origin main

# 8. GitHub Pages deployment info
echo ""
echo "================================================================"
echo "✅ Deployment Complete!"
echo ""
echo "📍 Repository: https://github.com/rstimpapua21-cmyk/Dashboard-Sa-Antar-Ko"
echo ""
echo "🌐 To enable GitHub Pages:"
echo "   1. Go to repository Settings > Pages"
echo "   2. Source: Select 'main' branch"
echo "   3. Folder: Select '/ (root)'"
echo "   4. Click Save"
echo ""
echo "   OR use GitHub Actions for auto-build:"
echo "   - Go to Actions > Set up a workflow yourself"
echo "   - Use the .github/workflows/deploy.yml template"
echo ""
echo "🎯 Your dashboard will be live at:"
echo "   https://rstimpapua21-cmyk.github.io/Dashboard-Sa-Antar-Ko/"
echo ""
echo "================================================================"
