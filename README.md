# browserstack-demo-app
A shopping application to demonstrate real-world usage of BrowserStack testing methods, patterns, and workflows.

## Features
🛠 Built with [React](https://reactjs.org/), [Next](https://nextjs.org/)  
⚡️ Zero database dependencies  
🚀 Full-stack [Next](https://nextjs.org/)/[React](https://reactjs.org/) application with real-world features  
👮‍♂️ Local Authentication  


## Getting Started

BrowserStack Demo App is a full-stack Next/React application.

The app is bundled with [offers data](./src/constants/offers.json), [orders data](./src/constants/orders.json) and [products data](./src/constants/products.json) that contains everything you need to start using the app and run tests out-of-the-box.

The app also includes product images which are stored in [public/static](./public/static) folder.

> 🚩 **Note**
>
> You can login to the app with any of the example users `image_not_loading_user, existing_orders_user or fav_user` . The default password for all users is `testingisfun99`.  


### Prerequisites
You can run this project via [Docker](https://www.docker.com/) or [Node.js](https://nodejs.org/en/) installed on your machine. Node **26** (LTS) is recommended and pinned in [.nvmrc](./.nvmrc), so `nvm use` picks it up; Node 22 and 24 are also supported and tested in CI.

### Installation with node

Node 26 no longer bundles Corepack, so install Yarn 1 first if you don't have it (`npm install -g yarn`).

```shell
yarn install
```

### Run the app

```shell
yarn dev
```

visit `http://localhost:3000/`

### Open Swagger UI

visit `http://localhost:3000/swagger`

### Browser support

The shop pages are compiled for the browsers listed under `browserslist` in [package.json](./package.json) (Chrome 49+, Firefox 50+, Safari 10+, Edge 15+). Internet Explorer is not supported. The Swagger UI page needs a newer browser (Chrome 62+, Firefox 78+, Safari 16.4+).

### Styles

Global stylesheets are imported in [pages/_app.js](./pages/_app.js), in an order that matters for the cascade. [styles/tailwind.css](./styles/tailwind.css) is a pre-compiled Tailwind CSS 1.9.6 build; don't edit it by hand.

### End-to-end tests

A Playwright regression suite covering every page, user flow and API lives in [e2e](./e2e). See [e2e/README.md](./e2e/README.md).

### Load Testing SUT
To Test SUT:
1. Start the dev server: `yarn dev`
2. Navigate to: `http://localhost:3000/sut/login`
3. Login with: `testuser` / `password`
4. Access dashboard and test endpoints
