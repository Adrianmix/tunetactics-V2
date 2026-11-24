# TuneTactics — Pre-Launch Landing Page

Static Astro + React + Tailwind CSS + Three.js pre-launch waitlist page for TuneTactics, ready to deploy on standard cPanel shared hosting (`public_html`).

## Project Structure

- `src/pages/index.astro` — Static landing page composition
- `src/data/content.ts` — Centralized English copy & form options
- `src/components/AcousticBackground.tsx` — Subtle Three.js acoustic wave & harmonic ring background
- `src/components/ProductPreview.tsx` — Interactive Producer/Singer Portfolio & Reels stem mockup
- `src/components/WaitlistForm.tsx` — Waitlist signup island (`email`, `role`, `looking_for`)
- `src/components/FaqAccordion.tsx` — Accessible FAQ disclosure list
- `public/api/waitlist.php` — Native PHP waitlist handler + dark-mode HTML email templates

## Local Development & Static Build

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run local development server (port 3000):
   ```bash
   npm run dev
   ```
   > Note: Node/Vite local dev does not execute `.php` files. The waitlist form detects static preview automatically so you can test validation, success, and duplicate states locally.

3. Build the 100% static cPanel bundle:
   ```bash
   npm run build
   ```
   This outputs pure HTML, CSS, JS, images, and `api/waitlist.php` into the `dist/` folder.

## Deploying to cPanel (`public_html`)

1. Run `npm run build`.
2. Open **cPanel → File Manager** and navigate to `public_html/` (or your addon domain root).
3. Upload the **contents** of the local `dist/` folder directly into `public_html/` (so `index.html`, `_astro/`, and `api/waitlist.php` sit inside `public_html/`).
4. Create the email mailbox **`support@tunetactics.ir`** in **cPanel → Email Accounts** if not already created.
5. Edit `public_html/api/waitlist.php` in File Manager and update the SMTP constants near the top:
   ```php
   const SMTP_HOST       = 'mail.tunetactics.ir'; // From cPanel -> Connect Devices
   const SMTP_PORT       = 465;                   // 465 (SSL) or 587 (TLS)
   const SMTP_ENCRYPTION = 'ssl';                 // 'ssl' or 'tls'
   const SMTP_USERNAME   = 'support@tunetactics.ir';
   const SMTP_PASSWORD   = 'YOUR_ACTUAL_EMAIL_PASSWORD';
   ```
6. Ensure PHP 8.1+ is active in **cPanel → MultiPHP Manager**.
7. Test a waitlist submission on your live domain:
   - The subscriber receives the **Founding Member confirmation email**.
   - `support@tunetactics.ir` receives the **Admin notification email**.
   - Signups are also backed up in `waitlist_data/subscribers.json` and `waitlist_data/subscribers.csv` (automatically protected via `.htaccess`).
