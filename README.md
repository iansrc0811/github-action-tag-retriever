# GitHub Actions Staging Tag Copier

A Chrome extension that adds a copy button next to the "staging" group header in GitHub Actions workflow run pages for `resumecompanion` repositories.

## What it does

When you visit a GitHub Actions workflow run page like:
```
https://github.com/resumecompanion/{PROJECT_NAME}/actions/runs/{ID}
```

The extension:
1. Finds the "staging" job group in the sidebar
2. Extracts the build tag (e.g., `2.12.1-57-gf1b9212`) from the job names
3. Adds a copy button to the left of the "staging" title
4. Clicking the button copies the tag string to your clipboard

## Installation

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable **Developer mode** (toggle in the top-right corner)
4. Click **Load unpacked**
5. Select the folder containing this extension
6. The extension is now active on matching GitHub pages

## Tag Pattern

The extension looks for tags matching the pattern: `X.Y.Z-N-gHASH`
- `X.Y.Z` - semantic version (e.g., `2.12.1`)
- `N` - number of commits since tag (e.g., `57`)
- `gHASH` - git commit short hash prefix (e.g., `gf1b9212`)

This is the standard `git describe` output format.
