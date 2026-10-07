FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:24-bookworm-slim
ENV NODE_ENV=production HOST=0.0.0.0 HAN_DB_PATH=/app/data/han.sqlite
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev && mkdir data backups && chown node:node data backups
COPY --from=build /app/dist ./dist
COPY server ./server
USER node
EXPOSE 3001
CMD ["node","server/index.mjs"]
