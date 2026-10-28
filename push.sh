#!/usr/bin/env bash
# ==============================================================================
# AutoClip AI - Automated Build & GitHub Push Script
# Usage:
#   ./push.sh                     (Uses default commit message)
#   ./push.sh "custom message"    (Uses your custom commit message)
# ==============================================================================

set -e # Exit immediately on error

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

COMMIT_MSG="${1:-feat: updated React frontend workflow}"

echo -e "\n${BLUE}======================================================${NC}"
echo -e "${BLUE}🚀 Starting AutoClip AI Frontend Build & Push Pipeline${NC}"
echo -e "${BLUE}======================================================${NC}\n"

# Step 1: Install Dependencies
echo -e "${YELLOW}[1/5] Checking and installing dependencies (npm install)...${NC}"
npm install

# Step 2: Build Project
echo -e "\n${YELLOW}[2/5] Building React application with Vite (npm run build)...${NC}"
npm run build
echo -e "${GREEN}✓ Production build succeeded cleanly!${NC}"

# Step 3: Stage Changes
echo -e "\n${YELLOW}[3/5] Staging changes (git add .)...${NC}"
git add .

# Step 4: Check for Changes & Commit
echo -e "\n${YELLOW}[4/5] Committing changes...${NC}"
if git diff --staged --quiet; then
  echo -e "${GREEN}✓ Working tree is already clean. Nothing new to commit.${NC}"
else
  git commit -m "$COMMIT_MSG"
  echo -e "${GREEN}✓ Committed with message: \"$COMMIT_MSG\"${NC}"
fi

# Step 5: Push to GitHub
echo -e "\n${YELLOW}[5/5] Pushing to GitHub (origin main)...${NC}"
git push origin main

echo -e "\n${GREEN}======================================================${NC}"
echo -e "${GREEN}🎉 Successfully built and pushed to GitHub!${NC}"
echo -e "${GREEN}Repository: https://github.com/karthik-0279/saltclipper${NC}"
echo -e "${GREEN}======================================================${NC}\n"
