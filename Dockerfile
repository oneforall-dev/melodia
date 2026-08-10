FROM node:22-bookworm-slim AS build

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build && npm prune --omit=dev

FROM node:22-bookworm-slim AS runtime

ENV NODE_ENV=production \
    PORT=3000

WORKDIR /app
RUN groupadd --system --gid 1001 melodia \
    && useradd --system --uid 1001 --gid melodia --create-home melodia \
    && mkdir -p /data \
    && chown melodia:melodia /data

COPY --from=build --chown=melodia:melodia /app/node_modules ./node_modules
COPY --from=build --chown=melodia:melodia /app/dist ./dist
COPY --from=build --chown=melodia:melodia /app/server ./server
COPY --from=build --chown=melodia:melodia /app/server.ts ./server.ts
COPY --from=build --chown=melodia:melodia /app/package.json ./package.json
COPY --from=build --chown=melodia:melodia /app/tsconfig.json ./tsconfig.json

USER melodia
EXPOSE 3000
CMD ["node", "--import", "tsx", "server.ts"]
