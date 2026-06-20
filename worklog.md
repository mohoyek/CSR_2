---
Task ID: 1
Agent: main (Z.ai Code)
Task: Build a responsive Persian RTL website similar to a provided sample image. The website is a CSR (Certificate Signing Request) generator for the Iranian Tax Authority (Samaneh Moudian), based on a provided PDF guide (GICA.SW.User.CertProfilev1.0). Supports two person types: UNA (شخص حقیقی - Natural Person) and NGO (شخص حقوقی - Legal Person). Default password must be "RAYNOP@SSWORD123456".

Work Log:
- Read the uploaded sample image (pasted_image_1781934230178.png) using VLM CLI to understand the target design (clean Persian RTL form, two radio options at top, dynamic fields, blue submit button)
- Extracted text from the uploaded PDF (CertProfileGuideForCSR.pdf) using the pdf skill's extract.text command (13 pages, Persian/RTL). Decoded the reversed RTL text to understand:
  - 3-step workflow: install OpenSSL, generate CSR (config.txt + commands), generate pfx
  - Config template format (CN, O, OU, serialNumber, S, L, C, E fields)
  - OpenSSL command reference
  - Two certificate profiles: UNA (Unaffiliated Natural Person) and NGO (Non-Governmental Legal Person) with their required field mappings
- Installed `node-forge` and `@types/node-forge` for actual RSA 2048 + SHA-256 CSR generation in the backend
- Updated `src/app/layout.tsx`: set `lang="fa"` `dir="rtl"`, replaced Geist font with Vazirmatn (Persian font from next/font/google), updated metadata to Persian title/description
- Rewrote `src/app/globals.css`: replaced default colors with an emerald/teal Iranian-inspired palette (oklch-based, dark-mode supported), added hero/grid background patterns, RTL-friendly scrollbar, code-block LTR styling
- Created `src/lib/iran-data.ts`: list of 30 Iranian provinces with their major cities for the form's Select dropdowns, plus the DEFAULT_PASSWORD constant
- Created `src/components/csr/file-viewer.tsx`: a reusable component showing a generated file's content with copy + download buttons (LTR for code, RTL chrome)
- Created `src/app/api/generate-csr/route.ts`: POST endpoint that validates input, builds config.txt content, generates RSA 2048 keypair via node-forge, builds a CSR with proper subject attributes (including serialNumber OID 2.5.4.5), signs with SHA-256, and returns all 4 PEM/text files plus the OpenSSL command reference
- Created `src/app/page.tsx`: full single-page CSR generator with:
  - Sticky header with logo and GICA badge
  - Hero section with title, description, and tech badges
  - 3-step form: persona toggle (UNA/NGO) → dynamic fields → password (default `RAYNOP@SSWORD123456`)
  - UNA fields: first/last name (Fa+En), 10-digit national code, province/city selects, email
  - NGO fields: org name (Fa+En), 11-digit national ID, optional org units, province/city selects, email
  - Right sidebar: about card, 5-step OpenSSL accordion guide, security alert
  - Validation with inline error list + toast notifications
  - Results section (appears after submission): summary card, 4 FileViewer cards (config.txt / mycsr.txt / mykey.key / mypublickey.pem), OpenSSL command reference blocks, "download all" button
  - Sticky footer with GICA metadata
- Fixed a critical bug: `csr.sign(key, "sha256")` failed because node-forge's CSR sign function does NOT convert a string to an md instance (unlike cert.sign). Changed to `forge.md.sha256.create()` instance.
- Tested end-to-end with Agent Browser:
  - Desktop view: RTL layout correct, form renders, persona toggle works
  - NGO flow: filled all fields, selected Tehran/تهران, submitted → CSR generated, all 4 files downloadable, config.txt matches the PDF guide format exactly (CN=...[Stamp], O=Non-Governmental, OU=org name in Persian, 1.OU, S, L, C=IR, E)
  - UNA flow: switched persona, form fields changed automatically (name, national code instead of org info), submitted → CSR generated, config.txt matches UNA profile (CN=Name Family [Sign], O=Unaffiliated, SN, G, S, L, C=IR)
  - Mobile (iPhone 14) view: responsive layout confirmed
  - Tablet (768×1024) view: responsive layout confirmed
  - VLM evaluation: 8/10 for both desktop and mobile, no visual issues
  - No console errors, no runtime errors
- Ran `bun run lint`: clean (no errors)

Stage Summary:
- Production-ready Persian RTL CSR generator website for the Iranian Tax Authority (Samaneh Moudian)
- Fully functional: users can fill the form for either UNA (natural person) or NGO (legal person), click submit, and download 4 ready-to-use files (config.txt, mykey.key, mypublickey.pem, mycsr.txt) — no OpenSSL installation required
- Default password "RAYNOP@SSWORD123456" pre-filled in the form
- Config file format strictly follows the GICA.SW.User.CertProfilev1.0 PDF guide
- Real CSR generation happens server-side via node-forge (RSA 2048, SHA-256)
- OpenSSL command reference shown for users who prefer the manual path
- Responsive (mobile, tablet, desktop), accessible, with proper RTL Persian typography (Vazirmatn font)
- Emerald/teal Iranian-inspired color palette (no blue/indigo per design rules)
- Sticky footer, sticky header, scroll-to-results on submit, copy + download buttons per file, "download all" button
- All files for the project: src/app/layout.tsx, src/app/globals.css, src/app/page.tsx, src/app/api/generate-csr/route.ts, src/lib/iran-data.ts, src/components/csr/file-viewer.tsx
