FROM node:20-slim

WORKDIR /app

# openssl/ca-certificates are required by Prisma's query engine at runtime
RUN apt-get update -y \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Production runs against the existing PostgreSQL container (bcap-db), while
# prisma/schema.prisma stays "sqlite" for local `npm run dev`. Swap the
# provider only inside this build so the generated Prisma Client speaks
# postgresql at runtime.
RUN sed -i 's/provider = "sqlite"/provider = "postgresql"/' prisma/schema.prisma
RUN npm run build

RUN chmod +x ./docker/entrypoint.sh

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

EXPOSE 3000

ENTRYPOINT ["./docker/entrypoint.sh"]
