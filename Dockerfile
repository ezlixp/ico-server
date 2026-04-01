FROM node:22-slim AS base
WORKDIR /usr/local/backend

FROM base AS backend-deps
COPY package*.json ./
RUN npm ci

FROM backend-deps AS backend-build
COPY .env.* ./
COPY tsconfig.json ./
COPY src ./src
RUN npx tsc

FROM backend-build AS backend-test
COPY jest.config.json ./
COPY test ./test
RUN npm test

FROM base AS backend-prod-deps
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force


FROM backend-deps AS backend-dev
CMD ["npm", "run", "dev:docker"]

FROM node:22-slim AS backend-final
WORKDIR /usr/local/backend
ENV NODE_ENV=production

COPY --from=backend-prod-deps /usr/local/app/node_modules ./node_modules
COPY --from=backend-build /usr/local/app/dist/src ./dist
COPY .env.production ./

EXPOSE 3000
CMD ["node", "dist/index.js"]