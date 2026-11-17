# Realtime SUT (WebSocket + gRPC). Same base image as the bstackdemo app image
# (browserstack-docker browserstack-demo-app/Dockerfile); runs as the unprivileged node user.
ARG NODE_IMAGE=node:24.22.1-alpine@sha256:06d7adf3e0ef61a13f1d28682726366f97a15aa1888c934d3ecec86c33918b53

FROM ${NODE_IMAGE} AS deps
WORKDIR /opt/realtime
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force

FROM ${NODE_IMAGE}
ENV NODE_ENV=production
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack \
           /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack \
           /usr/local/bin/yarn /usr/local/bin/yarnpkg /opt/yarn-*
WORKDIR /opt/realtime
COPY --from=deps /opt/realtime/node_modules ./node_modules
COPY package.json ./
COPY src ./src
COPY proto ./proto
USER node
# 8080 HTTP + WebSocket, 50051 gRPC with reflection, 50052 gRPC without, 50099 TCP reset.
EXPOSE 8080 50051 50052 50099
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1:8080/healthz >/dev/null || exit 1
CMD ["node", "src/index.js"]
