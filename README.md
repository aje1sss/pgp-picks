# PGP Picks — Finals Edition

A static, mobile-first recommendation website for PGP residents. No server, database or API key required.

## Publish with Netlify Drop (easiest)
1. Unzip `pgp-picks-website.zip` on your computer.
2. Open https://app.netlify.com/drop and sign in or create a free account if prompted.
3. Drag the **pgp-picks folder** (the folder containing `index.html`) into the drop area.
4. Netlify provides a public `*.netlify.app` URL. Open it on your phone and test all three categories.
5. In your Netlify project settings, you can change the site name to something memorable if available.
6. Create a QR code from the FINAL live URL and test it before printing or posting.

## Publish with GitHub Pages (alternative)
1. Create a GitHub repository, e.g. `pgp-picks`.
2. Upload `index.html`, `style.css`, `app.js`, and `places.js` into the repository root.
3. Open Settings > Pages > Build and deployment > Deploy from a branch.
4. Select `main` and `/ (root)`, then Save.
5. Your site will typically be at `https://YOUR-USERNAME.github.io/pgp-picks/` after deployment finishes.

## How to edit recommendations
Open `places.js` in a text editor. Each entry has:
- `name`: place name
- `category`: `eat`, `focus`, or `escape`
- `tags`: used for matching preferences
- `budget`: approximate maximum spend for matching (SGD); **placeholder until verified**
- `distance`: 0=PGP, 1=NUS, 2=nearby, 3=further
- `minutes`: rough time allowance category, **not a measured travel time**
- `description`, `location`, `note`, `image`

The app filters out results over the selected budget/distance/time constraints. For food, the budget field is a broad placeholder and MUST be checked against actual menu prices before publishing. Do not claim a venue meets a dietary requirement unless confirmed. The expanded version deliberately does not include dietary filtering because individual stalls and food-preparation practices need verification.

## Before launch — mandatory editorial checks
- Verify that every venue is currently operating and accessible to PGP residents.
- Check prices, opening hours, and study-space access with official sources.
- Verify realistic travel times from PGP, especially if adding travel-time claims.
- Replace generic illustrative images with photos you have permission to use; ensure photos actually show the named places if labelled as such.
- Test on iPhone and Android, including every quiz path, Save, Share and Google Maps.
- Add committee credit and any required NUS/PGP branding approvals.
- Confirm accessibility, dietary details and transport options where relevant.

## Notes
Saved picks are stored only in the resident's browser using localStorage. They may disappear if browsing data is cleared. No personal data is sent to a custom server. Fonts and illustrative photos load from third-party services.

## Expanded November 2026 recommendations
- 66 curated entries: eat: 26, focus: 27, escape: 13.
- The `source` field links to official NUS listings where available. Google Maps buttons search for each venue by name and location; this is **not a Google Maps Places API integration**, and there are no live ratings or reviews.
- Study areas include specific NUS Libraries, UTown ERC, and CDE locations. Special 24-hour access is time-limited; check official notices.
- Budget values for food are **unverified planning estimates**, not menu prices. Do not publish them as guaranteed prices.
- Before publishing, validate any venue-specific prices and replace generic photos with permitted real images.


## November revision
Removed VOL. 01; replaced generic PGP food and mall dining placeholders; added named eateries and suggested dishes; expanded Escape to museums, games, shopping, cafes and adventures. Escape questions now include these moods. All new budgets/travel estimates are placeholders and should be verified before publicity. Some broad canteen entries remain and need specific stall-level verification.


## Hidden gems and photos (new)
The curated list now contains specific stalls, dishes and unusual experiences, with source links. Some are editorial leads and not independently checked in person. Budgets and times in `places.js` are **matching thresholds, not actual quoted prices or travel times**. Check each before publicity.

Card photos are **illustrative**. Every result has a **REAL PHOTOS** link to a Google Maps search for the venue; Maps itself shows venue photos where available. This is the no-key, no-billing solution.

To show Google Maps photos directly inside PGP Picks in future, use Google Places API (New) Place Photos with Google Cloud billing, a restricted API key and correct attribution. Do not scrape Google Maps photo URLs, and do not expose an unrestricted server key in browser JavaScript. The current website does not claim to have a live Google Photos feed.

## Updating Netlify
Extract the ZIP and upload the folder containing `index.html` in the existing Netlify site Deploys area to retain your URL.


## Version 4 — broader food discovery
Added 30 named west-side food discoveries from Singapore food guides (with source links in places.js). These are research leads, NOT individually verified live venues. Budget values are provisional upper screening bands, not menu prices. Always verify trading status, opening hours, dietary certification, exact dish and price. West Coast Market Square (Blk 726) is not added because of its reported closure through 27 December 2026. Food scoring now gives hidden gems a modest boost.

## V5 expansion
- 53 food, 39 study, 56 activity records.
- New study areas: Yusof Ishak House (YIH) open spaces and multipurpose areas. Use only when unoccupied; official YIH access rules apply.
- New activities: on-campus games, museums, independent cinema, bookshops, and activity leads. Some activity leads are **not specific verified venues** and should be replaced before publication.
- Activity budgets are **rough upper-bound placeholders** for quiz filtering, not verified prices.
- Source links are included where available. Verify individual places and update the records before posting a public QR code.


## V6 study finder changes (7 November 2026)
- Atmosphere: quiet / background noise / group / outdoors.
- Facilities: multi-select power, air-conditioning, late access, group discussion, food nearby.
- Time: daytime, evening, after midnight.
- Multiple requirements are combined with AND; atmosphere must match. No invented fallbacks.
- Late-night recommendations are restricted to official NUS Libraries documented 24-hour spaces. Central Library L6 is date-gated through 4 December 2026; Medicine+Science L3 is treated as term-time only.
- NUS Libraries source: https://nus.edu.sg/nuslibraries/spaces/24-hour-study-spaces and https://www.nus.edu.sg/nuslibraries/spaces/our-libraries
- Power outlets are a general library amenity, not verified at every seat. Spaces with unverified access hours cannot match late-night filters.
- The app is static: it does NOT check real-time occupancy or automatically refresh official hours.


### V6 hotfix
Fixed a missing `IMAGES` constant that caused a blank homepage. Self-contained editorial placeholder graphics now display reliably, without external image hosting. These are illustrations, not real venue photos.


## V7 notes
- No dead-end results: strict matches are shown first, then clearly labelled closest alternatives.
- Late-night access is **never claimed** for an unverified space; alternative cards explicitly warn when it is unverified.
- Uses real editorial photographs via Unsplash CDN for visual appeal. These are **not** photos of the specific venue. To show actual venue photos inside the site, obtain properly licensed venue photos or implement Google Places API with billing, restrictions and attribution.
- Improved hero typography at desktop and mobile widths.
