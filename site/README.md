# MockMaker static site

This directory is a standalone static site for Cloudflare Pages or GitHub Pages.

Files:

- `index.html`: marketing / support landing page
- `privacy.html`: privacy policy page
- `app-ads.txt`: AdMob verification file at the site root

For Cloudflare Pages:

1. Create a Pages project.
2. Use `site` as the build output directory.
3. If no build is needed, set the build command to `exit 0`.
4. After deploy, verify:
   - `/`
   - `/privacy.html`
   - `/app-ads.txt`

For App Store Connect:

- Set `Marketing URL` to the deployed site root.
- Keep `app-ads.txt` reachable at `https://<hostname>/app-ads.txt`.
