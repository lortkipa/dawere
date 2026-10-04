# dawere

Georgian blogging platform with an AI chat for asking questions about the article you're reading.

Email codes aren't sent yet: `123456` always signs in.

## Run with Docker (production / NAS)

Needs Docker with Compose. Everything runs in containers: the app, PostgreSQL, and a daily database backup.

```bash
git clone https://github.com/lortkipa/dawere.git
cd dawere
cp .env.example .env    # then set POSTGRES_PASSWORD and SITE_URL
docker compose up -d --build
```

The site is at http://localhost:3000 (or `http://<nas-ip>:3000`; change the port with `APP_PORT`). Database migrations run automatically every time the app starts.

Run these from the project folder:

| Task | Command |
| --- | --- |
| Start | `docker compose up -d` |
| Stop | `docker compose down` (data is kept) |
| Restart the app | `docker compose restart app` |
| Check what's running | `docker compose ps` |
| Show app logs (live, Ctrl+C to exit) | `docker compose logs -f app` |
| Show logs of everything | `docker compose logs -f` |
| Update to the latest code | `git pull && docker compose up -d --build` |

### Where the data lives

All data is stored in plain folders next to this README, so containers can be deleted and rebuilt without losing anything:

```
data/postgres/        database files (used by Postgres only; don't copy or edit while it runs)
data/uploads/avatars/ profile photos
data/uploads/images/  photos in posts
backups/              daily database dumps, newest 14 kept
```

### Backups

The `backup` container writes `backups/dawere-<date>.sql.gz` when it starts and then every 24 hours. Include `backups/` and `data/uploads/` in your NAS backup tasks; copying `data/postgres/` is not a safe backup.

To restore a dump (this replaces the current database):

```bash
docker compose stop app
docker compose exec -T db psql -U dawere -d postgres -c 'DROP DATABASE dawere' -c 'CREATE DATABASE dawere'
gunzip -c backups/<file>.sql.gz | docker compose exec -T db psql -U dawere -d dawere
docker compose start app
```

### NAS notes

- Synology Container Manager, QNAP Container Station and similar can run this folder as a Compose "project", or use the commands above over SSH.
- Build the image on the NAS itself so it matches its CPU (x86 or ARM).
- Keep this folder on the NAS's own disks, not on a network share mounted from another machine; Postgres can corrupt data on network storage.
- For outside access, put the app behind the NAS's reverse proxy (or Caddy / a Cloudflare Tunnel) for HTTPS instead of exposing port 3000, and set `SITE_URL` to the public address.

## Local development

Requires Node 20.12+ and PostgreSQL. You can install Postgres yourself, or run just the database in Docker:

```bash
cp .env.example .env    # set POSTGRES_PASSWORD (only needed for the Docker database)
docker compose -f compose.yaml -f compose.dev.yaml up -d db
```

Then:

```bash
npm install
cp .env.example .env.local   # point DATABASE_URL at your database, e.g.
                             # postgres://dawere:<password>@localhost/dawere for the Docker one
npm run db:migrate
npm run dev      # http://localhost:3000
```

Uploaded photos are saved under `UPLOAD_DIR` (default `./uploads`).
