# browserstack-demo-app
A shopping application to demonstrate real-world usage of BrowserStack testing methods, patterns, and workflows.

## Features
🛠 Built with [React][reactjs], [Next][nextjs]
⚡️ Zero database dependencies  
🚀 Full-stack [Next][nextjs]/[React][reactjs] application with real-world features 
👮‍♂️ Local Authentication  


## Getting Started

BrowserStack Demo App is a full-stack Next/React application.

The app is bundled with [offers data](./src/constants/offer.json), [orders data](./src/constants/orders.json) and [products data](./src/constants/products.json) that contains everything you need to start using the app and run tests out-of-the-box.

The app also includes product images which are stored in [public/static folder](./public/static)

> 🚩 **Note**
>
> You can login to the app with any of the example users `image_not_loading_user, existing_orders_user or fav_user` . The default password for all users is `testingisfun99`.  


### Prerequisites
You can run this project via docker or [Node.js](https://nodejs.org/en/) **version 12** installed on your machine.

### Installation with node

```shell
yarn install
```

### Run the app

```shell
yarn dev
```

visit `http://localhost:3000/`

### Installation with docker

First, Install docker:

```bash
https://docs.docker.com/engine/install/
```

### Run the app

```shell
docker build -t client . && docker run --name CLIENT_CONTAINER -p 0.0.0.0:5000:3000 client
```

visit `http://localhost:5000/`
