import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const config = [
  ...nextVitals,
  ...nextTs,
  // data/ and backups/ come from Docker Compose; data/postgres isn't even readable.
  { ignores: [".next/**", "node_modules/**", "next-env.d.ts", "data/**", "backups/**", "uploads/**"] },
];

export default config;
