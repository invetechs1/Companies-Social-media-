# Deployment — Bassir Social Pro

Deploys this app as a Docker image, redeploying it onto the existing production
host where it already runs as container `bcap-app` on the `bcap-net` network,
talking to the existing PostgreSQL container `bcap-db`.

**Important:** production uses PostgreSQL, not the SQLite that ships in
`prisma/schema.prisma` for local dev. The `Dockerfile` swaps the Prisma
datasource provider to `postgresql` *inside the image build only* (via `sed`
on a copy of the schema baked into the image) — your local
`prisma/schema.prisma` on disk is never touched, so `npm run dev` keeps using
SQLite unchanged.

`bcap-db` and every other container/image on the host are out of scope for
this runbook — nothing here should touch them.

## 1. Build the image locally and replace the old one

```bash
# Remove the previous local image for this project (if present)
docker rmi -f bcap:latest

# Build the new image
docker build -t bcap:latest .

# Save it to a tar file for transfer
docker save -o bcap.tar bcap:latest
```

`bcap.tar` will be ~400MB.

## 2. Send the tar to the server

```bash
scp bcap.tar root@13.140.138.252:/root/bassir-social-pro/
```

(The remote folder is created once in step 3 below — create it first if this
is the very first deploy.)

## 3. Remote folder layout

On the server, everything for this project lives in its own folder so it
never collides with the other ~50 unrelated projects/containers already
running on this host:

```
/root/bassir-social-pro/
├── bcap.tar        # the image tar uploaded in step 2
├── .env            # production secrets (DATABASE_URL, AUTH_SECRET, ...) — chmod 600
└── deploy.sh        # loads the tar and (re)starts the bcap-app container
```

`.env` (values match the currently running `bcap-app` container so existing
sessions/DB connection keep working):

```bash
DATABASE_URL="postgresql://bcap_app:<password>@bcap-db:5432/bcap?schema=public"
AUTH_SECRET="<existing production secret>"
CRON_SECRET="<secret for /api/cron/publish>"
APP_URL="http://13.140.138.252:3006"
```

## 4. `deploy.sh` (lives on the server at `/root/bassir-social-pro/deploy.sh`)

```bash
#!/usr/bin/env bash
# Redeploys ONLY this project's container/image.
# Does not touch bcap-db or any other container/image on this host.
set -euo pipefail
cd "$(dirname "$0")"

echo "Stopping old container (if running)..."
docker rm -f bcap-app 2>/dev/null || true

echo "Removing old image..."
docker rmi -f bcap:latest 2>/dev/null || true

echo "Loading new image from bcap.tar..."
docker load -i bcap.tar

echo "Starting new container..."
docker run -d \
  --name bcap-app \
  --network bcap-net \
  --restart unless-stopped \
  -p 3006:3000 \
  --env-file .env \
  bcap:latest

echo "Done. Logs: docker logs -f bcap-app"
```

Run it with `bash deploy.sh` after every new `bcap.tar` upload.

## 5. Rollback

Docker images are content-addressed by layer, so if a deploy goes wrong and
you still have the previous `bcap.tar` on hand, `docker load -i old-bcap.tar`
followed by the same `docker run` command in step 4 brings the previous
version back. `bcap-db`'s data is untouched by any of the above, since the
app container is stateless (all state lives in Postgres).
