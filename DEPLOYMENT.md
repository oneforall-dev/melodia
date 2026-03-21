# Deployment Guide for Melodia

This guide covers how to deploy the Melodia application to a VPS (Virtual Private Server).

## Prerequisites

- Node.js (v18 or later)
- NPM (comes with Node.js)
- A VPS (e.g., DigitalOcean, Linode, AWS EC2)
- Domain name (optional but recommended)

## 1. Preparation

Ensure you have the following files ready to upload:
- `package.json` & `package-lock.json`
- `server.ts`
- `server/` directory
- `src/` directory (for building frontend)
- `public/` directory
- `vite.config.ts`
- `tsconfig.json`
- `index.html`

## 2. Upload to VPS

Upload your project files to your server (e.g., using `scp`, `rsync`, or `git clone`).

```bash
# Example using scp
scp -r ./melodia user@your-vps-ip:/var/www/melodia
```

## 3. Installation

SSH into your VPS and navigate to the project directory.

```bash
cd /var/www/melodia
npm install
```

## 4. Environment Configuration

Create a `.env` file based on the example.

```bash
cp .env.example .env
nano .env
```

**Important:**
- Set `NODE_ENV=production`
- Set a strong `JWT_SECRET`
- Add your `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`
- Set `DATABASE_PATH` if you want to store the database in a specific location (e.g., `/var/data/melodia.db`). Default is `./melodia.db`.
- **Optional:** Set `ADMIN_USERNAME` and `ADMIN_PASSWORD` to automatically create or update an admin user on startup.

## 5. Build the Frontend

Compile the React frontend. This generates the `dist/` folder.

```bash
npm run build
```

## 6. Start the Server

You can start the server directly for testing:

```bash
npm start
```

For production, use a process manager like **PM2** to keep the app running in the background and restart it on failure.

```bash
# Install PM2 globally
npm install -g pm2

# Start the app
pm2 start npm --name "melodia" -- start

# Save PM2 list to resurrect on reboot
pm2 save
pm2 startup
```

## 7. Reverse Proxy (Nginx) - Optional but Recommended

To serve your app on port 80/443 (HTTP/HTTPS) instead of 3000, set up Nginx.

Example Nginx Config (`/etc/nginx/sites-available/melodia`):

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable the site and restart Nginx:

```bash
ln -s /etc/nginx/sites-available/melodia /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

## Troubleshooting

- **Database Errors:** Ensure the directory for `DATABASE_PATH` exists and is writable by the user running the app.
- **Build Errors:** If `npm run build` fails, ensure your VPS has enough RAM (at least 1GB recommended).
- **Port Conflicts:** If port 3000 is taken, change `PORT` in `.env`.
