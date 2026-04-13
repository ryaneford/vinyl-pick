# GitHub Setup Guide

This guide explains how to publish Vinyl Pick on GitHub so others can use it.

## Prerequisites

- A GitHub account
- Git installed on your machine

## Step 1: Initialize Git

```bash
cd /home/ryan/vinyl-pick
git init
```

## Step 2: Create Initial Commit

```bash
git add .
git commit -m "Initial commit: Vinyl Pick - Random vinyl picker for Discogs

Features:
- OAuth authentication with Discogs
- Random vinyl record selection
- Shuffle without repeat
- Dark/light mode toggle
- Docker deployment support"
```

## Step 3: Create GitHub Repository

1. Go to https://github.com/new
2. Enter repository name: `vinyl-pick`
3. Choose "Public"
4. Click "Create repository"

## Step 4: Push to GitHub

```bash
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/vinyl-pick.git
git branch -M main
git push -u origin main
```

Replace `YOUR_GITHUB_USERNAME` with your actual GitHub username.

## Step 5: Verify

Visit `https://github.com/YOUR_GITHUB_USERNAME/vinyl-pick` to see your published repo!

## How Others Can Use It

Once published, anyone can:

1. **Fork** your repository
2. Create their own Discogs app at https://www.discogs.com/settings/developers
3. Deploy to their preferred hosting (Docker, Vercel, etc.)
4. Use their own Consumer Key/Secret

## Alternative: Make It Easy for Users

If you want to make it even easier for others:

### Option A: Use Environment Variables Only

Users only need to set environment variables - no code changes needed. Current implementation already supports this!

### Option B: Add a Config Page

Create a settings page where users can enter their Discogs credentials without editing code.

### Option C: Multi-User Support

Add a database to store multiple users' tokens.

---

After publishing, share the link! Users will need their own Discogs Consumer Key/Secret to use it.