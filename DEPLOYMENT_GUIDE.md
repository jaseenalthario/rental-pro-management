# Rental Pro Management System - Deployment Guide

This guide covers everything you need to do to take the application from development and put it live into a production environment. 

## 1. Setup Your Production Environment Variables
Before launching, copy the `.env.example` files to `.env` and fill them with your actual production data.

### Frontend (`/frontend/.env`)
Create a file named `.env` in the `frontend/` folder (next to `package.json`).
```env
VITE_API_BASE_URL=https://api.yourdomain.com/api
```
*(If you are deploying on the same server, you might just use `http://your-server-ip:8000/api`)*

### Backend (`/backend/.env`)
Create a file named `.env` in the `backend/` folder.
```env
# Change this to your actual production database credentials
DB_USER=root
DB_PASSWORD=your_secure_password
DB_HOST=localhost
DB_PORT=3306
DB_NAME=rental_pro

# Change to the real domain where your frontend will be hosted to allow secure cross-origin requests
FRONTEND_URL=https://yourdomain.com
```

---

## 2. Deploy the Frontend (React/Vite)
You don't run `npm run dev` in production. Instead, you serve the optimized static files.
I have already run the `npm run build` command for you, which generated a `dist/` folder in the `frontend/` directory.

### To Host on XAMPP (Apache):
1. Copy everything **inside** the `frontend/dist/` folder.
2. Paste it into your XAMPP's `htdocs` folder (usually `C:\xampp\htdocs\`).
3. You can now access your site locally at `http://localhost/` or globally if you configure a domain to point to your XAMPP server.

### To Host on Vercel / Netlify (Recommended):
1. Upload this codebase to a GitHub repository.
2. Link the repository to Vercel or Netlify.
3. Set the build command to `npm run build` and output directory to `dist/`.
4. Set the root directory to `frontend/`.
5. Add the `VITE_API_BASE_URL` to the Environment Variables settings in the dashboard.

---

## 3. Deploy the Backend (FastAPI / Database)
You shouldn't use `--reload` in production. For Windows/XAMPP environments, a solid choice is **Waitress** or just running Uvicorn properly.

### Running with Production Uvicorn
You can start the backend by running this command in the `backend/` folder. Keep this running in the background (using a tool like PM2, or a Windows Service).
```bash
.\venv\Scripts\python.exe -m uvicorn main:app --host 0.0.0.0 --port 8000
```
*Note: Binding to `--host 0.0.0.0` exposes the API securely to the outside world based on your firewall rules, rather than just `127.0.0.1`.*

### Database Setup
1. On your production server (or live XAMPP), create a MySQL database named `rental_pro` (or whatever you set in the `.env`).
2. Update the credentials in `backend/.env`. The backend script `database.py` will automatically attempt to connect and create tables if they do not yet exist, as long as it has access!
