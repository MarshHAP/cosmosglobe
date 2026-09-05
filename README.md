# COSMOS — Magnetic Levitating Globe Lamp store

A one-page e-commerce store for the COSMOS levitating globe lamp. Static HTML, CSS and vanilla JavaScript with no build step, so it can be hosted on GitHub Pages, Netlify, Vercel or any static host.

## Run it locally

```bash
npx serve .
# or
python3 -m http.server 8080
```

Then open <http://localhost:8080>.

## What's on the page

1. Announcement bar with a currency picker (GBP, USD, EUR, AUD)
2. Sticky header with nav, search, account and cart
3. Hero: "A Brighter Perspective"
4. Product card: gallery with six colour variants, plug-size selector, price, promo banner and add-to-cart
5. Customer reviews
6. "Bring the World to Your Space" feature section
7. "Pure Atmosphere" video section with a play button and modal
8. FAQ accordion in two columns
9. "How to Set This Up" three-step guide
10. Footer with newsletter sign-up, social links and legal links

## Interactions

- Colour swatches and thumbnails swap the main image and stay in sync.
- The currency picker converts all prices and pre-selects the matching plug.
- Add to Cart opens a slide-out cart drawer with quantity controls. The cart and currency are remembered in `localStorage`.
- The play button opens a video modal. Drop your product video in at `assets/cosmos.mp4` and it will play; until then the poster frame is shown.
- FAQ items expand one at a time per column.

## Swapping in real product photos

The product art in `assets/` is generated SVG placeholder artwork. To use your real photos, replace these files (keeping the same names) or update the paths in `index.html` and the `PRODUCT.variants` list in `js/main.js`:

| File | Used for |
| --- | --- |
| `assets/hero-globe.svg` | Hero image |
| `assets/globe-{silver,pink,aqua,black,midnight,gold}.svg` | Gallery, thumbnails and colour swatches |
| `assets/lifestyle.svg` | "Bring the World to Your Space" scene |
| `assets/video-still.svg` | Video section still and modal poster |
| `assets/step-1.svg`, `step-2.svg`, `step-3.svg` | Setup guide |

## Pricing and checkout

Prices, the discount and the colour list live at the top of `js/main.js` in `PRODUCT`. Exchange rates are in `CURRENCIES`. The Checkout button currently shows a message; connect it to Shopify, Stripe or your payment provider of choice.
