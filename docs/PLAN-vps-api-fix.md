# PLAN-vps-api-fix

## Goal
Resolve the `405 Method Not Allowed` error when n8n tries to POST telemetry data to `http://www.nikaotech.com/api/sensors`.

## Analysis of the Problem
1. **Nginx 405 Error**: The n8n image and our `curl` tests show that Nginx is answering on port 80, but it is returning `405 Not Allowed` for POST requests. This means Nginx is acting as a static file server and is **not** proxying the request to your Node.js backend.
2. **Port 3000 Conflict**: Our tests revealed that port 3000 on your VPS is currently being used by **Gotenberg** (an API for converting documents). If the Node.js server tried to start on port 3000, it either failed or was blocked.

## Proposed Changes

We need to orchestrate a fix between the `backend-specialist` and `devops-engineer`:

1. **Change Server Port**: 
   - Update `dashboard/server.js` or the PM2 startup command to use an available port, such as **3005** or **4000**, instead of 3000.
   
2. **Provide Correct Nginx Config**:
   - Give you the exact Nginx configuration snippet to place in `/etc/nginx/sites-available/nikaotech.com` to proxy traffic securely to the new port.

3. *(Optional Quick Fix)* **Direct Port Access**:
   - While Nginx is being configured, we could configure n8n to send data directly to the Node.js port (e.g., `http://www.nikaotech.com:4000/api/sensors`).

## User Action Required
Do you approve this plan?
- **Y**: I will adjust the documentation and code to configure the dashboard to run on a new port (like 4000) and provide the exact Nginx/PM2 commands for your VPS.
- **N**: Let me know if you prefer to use a specific port or if you want to bypass Nginx entirely.
