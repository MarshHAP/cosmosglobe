# COSMOS — Shopify theme

A Shopify Online Store 2.0 theme for the COSMOS magnetic levitating globe lamp. The home page is a one-page store: hero, featured product with colour and plug-size variants, reviews, feature section, video, FAQ, setup guide and footer with newsletter sign-up. Every section is editable in the Shopify theme editor.

## Connect this repo to Shopify

1. In Shopify admin go to **Online Store › Themes**.
2. Under **Theme library** click **Add theme › Connect from GitHub**.
3. Pick the `MarshHAP` account, the `cosmosglobe` repository and this branch.
4. Shopify pulls the theme in. Click **Customize** to open the editor, then **Publish** when you're happy.

Every push to the connected branch updates the theme automatically. Changes made in the theme editor are committed back to the branch by Shopify.

## Make the product shoppable

1. Create the product in **Products** with two options: **Color** (Silver, Pink, Aqua, Black, Midnight, Gold) and **Size** (EU plug, US plug, UK plug, AU plug). Set the price to £13.69 and, optionally, a compare-at price so the promo banner is calculated automatically.
2. Upload a photo per colour and assign it to that colour's variants. Colours without a photo fall back to the built-in illustrations when their name is one of the six above, or to a colour dot otherwise.
3. In the theme editor open the **Featured product** section on the home page and select the product.

Until a product is selected the section shows demo content so you can see the design.

## Theme structure

| Folder | What's inside |
| --- | --- |
| `layout/` | `theme.liquid` (main layout), `password.liquid` |
| `sections/` | Home page sections (`hero`, `featured-product`, `reviews`, `feature`, `video`, `faq`, `setup-steps`), header/footer groups, cart drawer, and `main-*` sections for standard pages |
| `snippets/` | `product-card` (gallery + buybox), `icon` |
| `templates/` | JSON templates for every page type, plus customer account templates and the gift card |
| `assets/` | `cosmos.css`, `cosmos.js`, and SVG illustrations used as placeholders |
| `config/` | Theme settings schema and defaults |
| `locales/` | English strings |

## Features

- Variant picker: colour swatches (from variant images) and plug-size pills, with price, promo and image updating live.
- AJAX add to cart with a slide-out cart drawer rendered by Shopify's Section Rendering API, so totals and currency are always server-accurate.
- Country/currency selector in the announcement bar using Shopify Markets (`localization` form). Add countries under **Settings › Markets** to enable it.
- Newsletter sign-up posts to Shopify customers with the `newsletter` tag.
- Video section supports an uploaded video or a YouTube/Vimeo link.
- Responsive down to phone widths, keyboard accessible, no JavaScript dependencies.

## Local development

```bash
npm i -g @shopify/cli
shopify theme check          # lint the theme
shopify theme dev --store your-store.myshopify.com   # live preview with hot reload
```

`static-preview/` contains a standalone HTML mock-up of the same design that can be opened without Shopify. It is not part of the theme.
