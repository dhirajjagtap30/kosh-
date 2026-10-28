<?php
/* ===== Ithe fakt ha file badla ===== */
define('DB_HOST', 'localhost');
define('DB_NAME', 'sahyadri_coaching');
define('DB_USER', 'root');          // XAMPP: root   | cPanel: tumcha db user
define('DB_PASS', '');              // XAMPP: (rikama) | cPanel: tumcha db password
define('APP_TZ',  'Asia/Kolkata');

/* React site che address (CORS). Live karatana tumcha domain taka, e.g. 'https://www.tumchasite.com'.
   '*' = kontihi (fakt testing sathi). */
define('ALLOWED_ORIGINS', '*');

define('TOKEN_HOURS', 12);              // login kiti tas chalto
define('MAX_UPLOAD_BYTES', 20 * 1024 * 1024);
define('UPLOAD_EXT', 'pdf,doc,docx,ppt,pptx,xls,xlsx,txt,png,jpg,jpeg');

/* Biometric machine push (optional): machine/server ne he secret token vaparaycha */
define('DEVICE_TOKEN', 'change-this-secret');
define('API_DEBUG', true);   // live karatana false kara
