# dawere

Georgian blogging platform with an AI chat for asking questions about the article you're reading.

Requires Node 20.9+.

```bash
npm install
npm run dev      # http://localhost:3000
```

Production (self-hosted):

```bash
npm run build
node .next/standalone/server.js   # copy .next/static and public/ next to it, or use `npm run start`
```
