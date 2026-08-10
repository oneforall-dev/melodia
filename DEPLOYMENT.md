# Melodia deployment on Coolify

Production URL: `https://chart.melodia.top`

## 1. DNS

Create an `A` record for `chart.melodia.top` pointing to the public IPv4 address of the Coolify server. If the server has IPv6, optionally add the matching `AAAA` record.

## 2. Create the Coolify resource

1. Create a new resource from the Git repository.
2. Select **Docker Compose** as the build pack.
3. Use `/docker-compose.yml` as the Compose file.
4. Keep **Base Directory** set to `/`.

## 3. Environment variables

Set these variables in Coolify:

```env
APP_URL=https://chart.melodia.top
JWT_SECRET=<random secret with at least 32 characters>
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
ADMIN_USERNAME=
ADMIN_PASSWORD=
```

`APP_URL` and `JWT_SECRET` are mandatory. The application intentionally refuses to start in production when either is missing or when `JWT_SECRET` is shorter than 32 characters.

Google and admin credentials are optional. If Google sign-in is enabled, register this exact authorized redirect URI in Google Cloud:

```text
https://chart.melodia.top/auth/google/callback
```

## Owner account

`agency.oneforall@gmail.com` is the fixed, unique owner identity. Signing in with that Google account promotes or recovers the account as owner automatically.

For password-based owner access, set both `ADMIN_USERNAME` and `ADMIN_PASSWORD`. On startup, the application creates or recovers that login and binds it to the fixed owner email. Changing `ADMIN_PASSWORD` in Coolify and redeploying rotates the owner password.

The owner cannot be demoted or modified by a normal administrator. Only the owner can grant or revoke superadmin status, and authorization is checked against SQLite on every protected request.

## 4. Domain and proxy

Assign `https://chart.melodia.top` to the `melodia-chart` service and internal port `3000`. Do not expose port 3000 directly on the host. Enable automatic HTTPS certificates in Coolify.

## 5. Persistent data

The named volume `melodia_data` stores `/data/melodia.db` and its SQLite WAL files. Include this volume in the server backup policy before accepting production data.

This application uses SQLite and should run as a single replica. Do not enable horizontal scaling without migrating the database to a server database such as PostgreSQL.

## 6. Verification

After deployment, verify:

```text
https://chart.melodia.top/health
```

It must return HTTP 200 with the body `OK`. Then test registration/login, a write operation, a redeploy, and confirm that the data persists.
