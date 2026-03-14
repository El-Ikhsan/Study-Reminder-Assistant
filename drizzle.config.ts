import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './src/db/schema.ts', // Pastikan jalur ini sesuai dengan letak file skemamu
  out: './drizzle',             // Folder tempat file migrasi SQL akan disimpan
  dialect: 'sqlite',            // D1 Cloudflare menggunakan dialek SQLite
})