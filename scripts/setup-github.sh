#!/bin/bash

echo "🔧 Setting up GitHub integration for VS Code..."
echo "=============================================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Please run this script from the project root directory"
    exit 1
fi

# Check Git configuration
echo "📋 Checking Git configuration..."
echo "Current Git user: $(git config user.name)"
echo "Current Git email: $(git config user.email)"
echo "Current remote origin: $(git config remote.origin.url)"
echo ""

# Check if GitHub CLI is installed
if command -v gh &> /dev/null; then
    echo "✅ GitHub CLI is installed"
    echo "GitHub CLI auth status:"
    gh auth status
    echo ""
else
    echo "⚠️  GitHub CLI not found. Installing..."
    # For dev containers, we can use the pre-installed package manager
    if command -v apt &> /dev/null; then
        sudo apt update && sudo apt install -y gh
    elif command -v brew &> /dev/null; then
        brew install gh
    else
        echo "❌ Unable to install GitHub CLI automatically"
        echo "Please install GitHub CLI manually: https://cli.github.com/"
        exit 1
    fi
fi

# Setup GitHub authentication if not already done
echo "🔐 Setting up GitHub authentication..."
if ! gh auth status &> /dev/null; then
    echo "Please authenticate with GitHub:"
    gh auth login --git-protocol https --web
else
    echo "✅ Already authenticated with GitHub"
fi

# Configure Git if needed
if [ -z "$(git config user.name)" ]; then
    read -p "Enter your Git username: " git_username
    git config --global user.name "$git_username"
fi

if [ -z "$(git config user.email)" ]; then
    read -p "Enter your Git email: " git_email
    git config --global user.email "$git_email"
fi

# Set up Git credential helper for HTTPS
git config --global credential.helper 'cache --timeout=3600'

# Verify remote repository
echo "🔗 Checking repository configuration..."
if git remote get-url origin &> /dev/null; then
    echo "✅ Remote origin is configured: $(git remote get-url origin)"

    # Test push access
    echo "🧪 Testing push access..."
    if git push --dry-run &> /dev/null; then
        echo "✅ Push access confirmed"
    else
        echo "⚠️  Push access test failed. You may need to authenticate or check permissions."
    fi
else
    echo "❌ No remote origin configured"
    echo "Please add your repository as origin:"
    echo "git remote add origin https://github.com/dukeblue1994-glitch/cxi-web.git"
fi

echo ""
echo "🎉 GitHub setup complete!"
echo "You should now be able to:"
echo "  - Use integrated terminal with proper Git authentication"
echo "  - Push and pull from your repository"
echo "  - Use GitHub Copilot (if enabled)"
echo "  - Access GitHub features in VS Code"
echo ""
echo "💡 Recommended next steps:"
echo "  1. Install recommended extensions from .vscode/extensions.json"
echo "  2. Restart VS Code to apply all settings"
echo "  3. Test with: npm run dev"
