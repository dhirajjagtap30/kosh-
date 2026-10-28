# PHP + MySQL backend (Sahyadri / kosh)

Ha folder tumchya React panel cha server aahe. Sagla data MySQL (phpMyAdmin) madhe save hoto.

## 1) Database (phpMyAdmin)
1. phpMyAdmin ughda -> **Import** tab
2. `backend/database/sahyadri_coaching.sql` nivda -> **Go**
3. `sahyadri_coaching` database + 29 tables banatil (demo login sahit)

## 2) Backend chalu kara (XAMPP - local)
1. `backend` folder `C:\xampp\htdocs\kosh\backend` madhe copy kara
2. `backend/config.php` madhe DB user/password bhara (XAMPP: root / rikama)
3. XAMPP madhe Apache + MySQL **Start**
4. Browser madhe ughda: http://localhost/kosh/backend/branches/public/  -> JSON disla pahije (branches chi list)

## 3) React panel joda
1. `.env` madhe already ase aahe:
   ```
   VITE_USE_MOCK=false
   VITE_API_BASE_URL=http://localhost/kosh/backend
   ```
2. `npm install` nantar `npm run dev`  -> http://localhost:5173
3. Login: admin / Admin@123 (baki list khali)

| Role | Username | Password |
|---|---|---|
| Super Admin | superadmin | Super@123 |
| Admin | admin | Admin@123 |
| Student | abhijeet | Student@123 |
| Parent | parent | Parent@123 |
| Staff | staff | Staff@123 |
| Trainer | trainer | Trainer@123 |

## 4) Live hosting (cPanel)
1. `.env` madhe `VITE_API_BASE_URL=https://tumchadomain.com/api` thewa, mag `npm run build`
2. `dist/` madhla sagla `public_html/` madhe upload kara (SPA fallback: sarva path -> index.html)
3. `backend/` folder `public_html/api/` madhe upload kara
4. cPanel -> MySQL Databases: DB + user banva, phpMyAdmin madhe SQL import kara, `config.php` madhe tya details bhara
5. `config.php` madhe `ALLOWED_ORIGINS` = 'https://tumchadomain.com', `API_DEBUG` = false, `DEVICE_TOKEN` badla
6. Demo passwords badla (Staff & Parents pages madhun / phpMyAdmin madhun)

## Mahatvache
- `uploads/` folder writable pahije (study material files). PHP chalu hot nahi tya folder madhe (.htaccess).
- Passwords hash (bcrypt) karun thevle jatat.
- Mod_rewrite + `AllowOverride All` pahije (XAMPP madhe default aahe).
- Biometric machine push (optional): `POST /device/punch/?token=<DEVICE_TOKEN>&branch=1`
- Dashboard -> Students page madhun navin student add hot nahi; **Registrations** vapra (login ID/password lagto).
