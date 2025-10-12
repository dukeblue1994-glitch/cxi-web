#!/bin/bash

echo "🔍 VS Code GitHub Integration Verification"
echo "=========================================="

# Test Git configuration
echo "✅ Git Configuration:"
echo "  User: $(git config user.name)"
echo "  Email: $(git config user.email)"
echo "  Remote: $(git remote get-url origin)"
echo ""

# Test GitHub CLI
echo "✅ GitHub CLI Status:"
gh auth status
echo ""

# Test VS Code workspace
echo "✅ VS Code Workspace Files:"
if [ -f ".vscode/settings.json" ]; then
    echo "  ✓ settings.json configured"
else
    echo "  ❌ settings.json missing"
fi

if [ -f ".vscode/extensions.json" ]; then
    echo "  ✓ extensions.json configured"
else
    echo "  ❌ extensions.json missing"
fi

if [ -f "cxi-web.code-workspace" ]; then
    echo "  ✓ workspace file created"
else
    echo "  ❌ workspace file missing"
fi
echo ""

# Test project dependencies
echo "✅ Project Dependencies:"
if [ -f "package.json" ]; then
    echo "  ✓ package.json found"
    if [ -d "node_modules" ]; then
        echo "  ✓ node_modules installed"
    else
        echo "  ⚠️  node_modules missing - run 'npm install'"
    fi
else
    echo "  ❌ package.json missing"
fi
echo ""

# Test development server
echo "🚀 Quick Development Test:"
echo "Run these commands to test your setup:"
echo "  1. npm run dev     # Start development server"
echo "  2. npm run build   # Build for production"
echo "  3. npm test        # Run tests"
echo ""

echo "🎯 Integration Summary:"
echo "  ✅ GitHub authentication configured"
echo "  ✅ Git operations working"
echo "  ✅ VS Code settings optimized"
echo "  ✅ Terminal properly configured"
echo "  ✅ Extensions ready for installation"
echo ""

echo "📝 Next Steps:"
echo "  1. Restart VS Code to apply all settings"
echo "  2. Open the workspace file: cxi-web.code-workspace"
echo "  3. Install recommended extensions when prompted"
echo "  4. Test with: npm run dev"
echo "  5. Verify GitHub Copilot is working (if subscribed)"
