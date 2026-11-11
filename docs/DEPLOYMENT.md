# GDG VCET Platform — Production Deployment Guide

## 1. Hosting Architecture Recommendations

Because the platform uses **Node.js 24 native SQLite with WAL mode** (`DatabaseSync`) for local zero-latency persistence, the recommended production target is a persistent Node environment.

### Target Deployment Options:

| Deployment Option | Supported | Notes |
|---|:---:|---|
| **Self-Hosted VPS (Ubuntu / Debian / Docker)** | ⭐ **Recommended** | Maximum control, native filesystem WAL performance, automated disk backups. |
| **Container Platform with Persistent Disk (Railway, Fly.io, Render)** | ⭐ **Recommended** | Zero maintenance, one-click Git deploys, attach 1GB persistent volume to `/app/data`. |
| **Vercel / Cloudflare Pages** | ⚠️ Needs Turso/LibSQL | Vercel serverless functions have ephemeral filesystems. For Vercel, swap SQLite connection to Turso / LibSQL URL. |

---

## 2. Option A: Docker Deployment (Recommended)

### 2.1 Multi-Stage `Dockerfile`

```dockerfile
# Stage 1: Dependencies & Build
FROM node:24-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Stage 2: Production Runner
FROM node:24-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Install SQLite CLI for backups and healthchecks
RUN apk add --no-cache sqlite

# Create persistent data volume
RUN mkdir -p /app/data && chown -R node:node /app/data

USER node

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

VOLUME ["/app/data"]

EXPOSE 3000

CMD ["npm", "start"]
```

### 2.2 `docker-compose.yml`

```yaml
version: '3.8'

services:
  gdg-platform:
    build: .
    restart: always
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_SITE_URL=https://gdgvcet.in
      - SESSION_SECRET=replace-with-secure-32-char-random-string
      - NEXT_PUBLIC_CHAPTER_ID=gdg-vcet
    volumes:
      - gdg_data:/app/data

volumes:
  gdg_data:
    driver: local
```

---

## 3. Option B: Self-Hosted VPS with PM2 & Nginx

### 3.1 Install Node 24 on Ubuntu
```bash
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
sudo apt-get install -y nodejs sqlite3
```

### 3.2 Build & Run with PM2
```bash
git clone https://github.com/gdg-vcet/gdg-platform.git /var/www/gdg
cd /var/www/gdg
npm ci
npm run build

sudo npm install -g pm2
pm2 start npm --name "gdg-vcet" -- start
pm2 save
pm2 startup
```

### 3.3 Nginx Reverse Proxy with SSL (Certbot)
```nginx
server {
    server_name gdgvcet.in www.gdgvcet.in;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
sudo certbot --nginx -d gdgvcet.in -d www.gdgvcet.in
```

---

## 4. Option C: Cloud PaaS (Railway / Render / Fly.io)

1. Connect the GitHub repository to Railway or Fly.io.
2. Add a **Persistent Volume**:
   - Mount Path: `/app/data`
   - Size: 1 GB (stores over 500,000 registrations).
3. Set Environment Variables:
   - `SESSION_SECRET`: Random 32+ characters string.
   - `NEXT_PUBLIC_CHAPTER_ID`: `gdg-vcet`.
   - `NEXT_PUBLIC_SITE_URL`: `https://your-domain.railway.app`.
4. Deploy: The build runs `next build` and runs the production server with the WAL SQLite engine intact.

---

## 5. Automated SQLite Backup Strategy

To ensure zero data loss during hardware failures or server migrations, schedule a daily cron job that safely executes a hot vacuum backup:

```bash
# /etc/cron.daily/backup-gdg-sqlite
#!/bin/bash
BACKUP_DIR="/var/backups/gdg-sqlite"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
mkdir -p "$BACKUP_DIR"

# Perform atomic hot backup without locking reads/writes
sqlite3 /var/www/gdg/data/gdg.db "VACUUM INTO '$BACKUP_DIR/gdg_backup_$TIMESTAMP.db';"

# Retain backups for 30 days
find "$BACKUP_DIR" -type f -name "*.db" -mtime +30 -delete
```

Make executable:
```bash
chmod +x /etc/cron.daily/backup-gdg-sqlite
```

---

## 6. Pre-Flight Production Checklist

- [ ] `SESSION_SECRET` updated to high-entropy random string.
- [ ] `./data` folder has write permissions for the application user.
- [ ] Nginx or cloud load balancer terminates HTTPS/TLS.
- [ ] Automated daily database backup script installed.
- [ ] Admin seed accounts tested and temporary passwords rotated.
- [ ] Custom domain DNS A/CNAME records pointed to the production server.

