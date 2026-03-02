# Directive: Deploy the TrackVisites Application

## Goal
Prepare and upload the TrackVisites application (static HTML/CSS/JS) to a production-ready environment (e.g., Vercel, Netlify, or a shared host) to make it accessible via a URL.

## Inputs
- `index.html`, `styles.css`, `script.js` (Root files)
- Images (e.g., `Exemple idesign interface.png`)
- Optional: Vercel/Netlify tokens for automated execution.

## Tools
- `npm -y serve` (for local verification before deployment)
- `execution/deploy_prep.ps1` (PowerShell script to clean and package files)
- `Vercel CLI` or `GitHub CLI` for orchestration.

## Output
- A public URL (e.g., `trackvisites.vercel.app`).
- A packaged `.zip` file for manual upload if needed.

## Steps (Orchestration Flow)
1. **Local Verification**: Run `npx serve -l 3000` to ensure no last-minute bugs.
2. **Execution Script**: Run `python execution/deploy_prep.py` to create a clean `dist/` directory (excluding `.git`, `directives/`, `execution/`, `.tmp/`).
3. **Deployment**:
   - **Option A (Vercel)**: Use `npx vercel deploy --prod ./dist`.
   - **Option B (GitHub Pages)**: Commit `dist/` to a `gh-pages` branch.
   - **Option C (Manual)**: Provide the `dist.zip` for the user to drop into Vercel/Netlify.

## Edge Cases
- **LocalStorage limitations**: Ensure the directive includes a note that data is CLIENT-SIDE ONLY.
- **Pathing**: Verify that all links to CSS/JS are relative and work in a subfolder or root.
- **Port Conflicts**: Handle cases where port 3000 is taken during testing.
