# StackDemo end-to-end tests

Playwright suite that pins the current behaviour of the app. It runs against any deployment, so you can check a local build and production with the same tests.

It has its own `package.json` so it doesn't touch the app's dependencies.

```shell
cd e2e
npm install
npx playwright install chromium
```

## Functional suite

```shell
# against a local server (default http://localhost:3000)
npm test

# against any deployment
BASE_URL=https://bstackdemo.com npm test
```

| Spec | Covers |
| --- | --- |
| `api.spec.js` | Every API route: products (incl. `fav_user`), orders, offers per city, sign-in errors, checkout, OpenAPI doc, SUT control endpoints, static assets, 404, all page routes |
| `catalogue.spec.js` | Home layout, product cards, vendor filters, sorting, search reload, `image_not_loading_user` |
| `cart.spec.js` | Add/remove, quantities, totals and installments, persistence across reloads, checkout redirect |
| `auth.spec.js` | Sign-in for every user, error messages, logout, protected-page redirects and return URLs |
| `checkout.spec.js` | Full purchase, confirmation, PDF receipt download, orders history |
| `favourites-offers.spec.js` | Favourites per user, geolocation offers (supported city, unsupported city, denied), Swagger UI |
| `sut.spec.js` | Load-testing SUT login, dashboard links, UI metric pages, logout and auth redirects |

## Visual regression suite

`visual.spec.js` compares 23 full-page screenshots (across 19 tests) pixel-for-pixel against a reference build. The reference screenshots are local and git-ignored, because rendering differs between operating systems.

```shell
# 1. Serve the known-good build (e.g. master) and record the reference
BASE_URL=http://localhost:3000 npm run test:visual:baseline

# 2. Serve the candidate build and compare
BASE_URL=http://localhost:3000 npm run test:visual
```

The two cart screenshots allow up to 600 differing pixels. The fixed, animated cart panel shows that much sub-pixel anti-aliasing noise even between runs of the same build. Every other screenshot must match exactly.
