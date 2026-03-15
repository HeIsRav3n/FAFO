FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install turbo and other global deps
RUN npm install -g turbo

# Copy the monorepo files (from root context)
COPY package.json package-lock.json turbo.json ./
COPY apps/bot/package.json ./apps/bot/package.json
COPY packages/database/package.json ./packages/database/package.json
COPY packages/core/package.json ./packages/core/package.json
COPY packages/jobs/package.json ./packages/jobs/package.json
COPY packages/typescript-config/package.json ./packages/typescript-config/package.json
COPY packages/eslint-config/package.json ./packages/eslint-config/package.json

# Install all dependencies
RUN npm install

# Copy source code
COPY . .

# Generate Prisma Client
RUN npx turbo run db:generate

# Build the bot
RUN npx turbo run build --filter=bot...

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copy necessary files from builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/bot/dist ./apps/bot/dist
COPY --from=deps /app/apps/bot/package.json ./apps/bot/package.json
COPY --from=deps /app/packages/database ./packages/database
COPY --from=deps /app/packages/core ./packages/core
COPY --from=deps /app/packages/jobs ./packages/jobs

# Start the bot
CMD ["node", "apps/bot/dist/index.js"]
