param (
    [string]$CommitMessage = "feat: updated React frontend workflow"
)

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "AutoClip AI - Build and Push Pipeline" -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Install Dependencies
Write-Host "[1/5] Checking dependencies (npm install)..." -ForegroundColor Yellow
npm install

# Step 2: Build Project
Write-Host ""
Write-Host "[2/5] Building React application (npm run build)..." -ForegroundColor Yellow
npm run build
Write-Host "[OK] Production build succeeded cleanly!" -ForegroundColor Green

# Step 3: Stage Changes
Write-Host ""
Write-Host "[3/5] Staging changes (git add .)..." -ForegroundColor Yellow
git add .

# Step 4: Check for Changes and Commit
Write-Host ""
Write-Host "[4/5] Committing changes..." -ForegroundColor Yellow
$staged = git status --porcelain
if (-not $staged) {
    Write-Host "[OK] Working tree clean. Nothing new to commit." -ForegroundColor Green
} else {
    git commit -m $CommitMessage
    Write-Host "[OK] Committed changes with message: $CommitMessage" -ForegroundColor Green
}

# Step 5: Push to GitHub
Write-Host ""
Write-Host "[5/5] Pushing to GitHub (origin main)..." -ForegroundColor Yellow
git push origin main

Write-Host ""
Write-Host "======================================================" -ForegroundColor Green
Write-Host "Successfully built and pushed to GitHub!" -ForegroundColor Green
Write-Host "Repository: https://github.com/karthik-0279/saltclipper" -ForegroundColor Green
Write-Host "======================================================" -ForegroundColor Green
Write-Host ""
