# Publish to GitHub Pages

```bash
cd arsann-website
git init -b main
git add .
git commit -m "ARSANN website"
git remote add origin https://github.com/<org-or-user>/<repo>.git
git push -u origin main
```
Then GitHub → Settings → Pages → Source: **GitHub Actions**. The site appears at `https://<org-or-user>.github.io/<repo>/`.
Largest files are the scene GLBs/textures (< 30 MB each, under GitHub's 100 MB file limit).
