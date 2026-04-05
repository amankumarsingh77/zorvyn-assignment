FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.29.3 --activate

# --- Dependencies ---
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# --- Generate Prisma client ---
FROM deps AS generate
WORKDIR /app
COPY prisma ./prisma
RUN pnpm db:generate

# --- Build ---
FROM generate AS build
WORKDIR /app
COPY tsconfig.json ./
COPY src ./src
RUN pnpm build

# --- Production ---
FROM base AS production
WORKDIR /app
ENV NODE_ENV=production

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod
RUN apk add --no-cache postgresql-client

COPY --from=build /app/dist ./dist
COPY --from=generate /app/generated ./dist/generated
COPY prisma ./prisma
COPY wait-for-db.sh /usr/local/bin/

EXPOSE 3000

ENTRYPOINT ["wait-for-db.sh"]
CMD ["node", "dist/src/index.js"]
