# dawere

Georgian blogging platform with an AI chat for asking questions about the article you're reading.

Requires Node 20.12+ and PostgreSQL.

```bash
npm install
createdb dawere
cp .env.example .env.local   # adjust DATABASE_URL if needed
npm run db:migrate
npm run dev      # http://localhost:3000
```

Email codes aren't sent yet: `123456` always signs in.

Uploaded photos are saved under `UPLOAD_DIR` (default `./uploads`). In production, set it to an absolute path outside the build folder.

Production (self-hosted):

```bash
npm run build
node .next/standalone/server.js   # copy .next/static and public/ next to it, or use `npm run start`
```
