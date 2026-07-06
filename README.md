# אתר בית חב"ד יפו

מונורפו לאתר בית חב"ד יפו.

- `client/` - צד לקוח: React, TypeScript, Vite, SCSS Modules
- `server/` - צד שרת: Node.js, Express, TypeScript, MongoDB
- `netlify.toml` - הגדרות build וניתובי Netlify

## דרישות

- Node.js
- npm
- MongoDB זמין דרך `MONGO_URI`

## התקנה

```bash
cd client
npm install

cd ../server
npm install
```

## הרצה מקומית

מריצים את השרת:

```bash
cd server
npm run dev
```

ברירת המחדל של השרת היא:

```text
http://localhost:4000
```

מריצים את האתר:

```bash
cd client
npm run dev
```

ברירת המחדל של Vite היא:

```text
http://localhost:5173
```

בפיתוח, ה-client פונה לשרת דרך:

```text
http://localhost:4000/api
```

אפשר לשנות זאת דרך `VITE_API_URL`.

## משתני סביבה

אין להעלות קבצי `.env` ל-Git.

### client

קבצים אפשריים:

- `client/.env`
- `client/.env.development`
- `client/.env.production`

משתנים בשימוש:

```env
VITE_API_URL=http://localhost:4000/api
VITE_META_PIXEL_ID=
VITE_NEDARIM_MOSAD=
VITE_NEDARIM_API_VALID=
VITE_NEDARIM_CALLBACK=
```

### server

קובץ מקומי:

```text
server/.env
```

משתנים בשימוש:

```env
PORT=4000
CLIENT_ORIGIN=http://localhost:5173
MONGO_URI=

ADMIN_PASSWORD=
JWT_SECRET=

TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_WHATSAPP_FROM=
ADMIN_WHATSAPP_TO=

SMTP_HOST=
SMTP_PORT=
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
ADMIN_EMAIL=
```

המשתנים של Twilio, MongoDB, סיסמת מנהל ו-JWT נדרשים לפעילות מלאה של השרת.

## סקריפטים שימושיים

### client

```bash
npm run dev
npm run build
npm run lint
npm run preview
```

### server

```bash
npm run dev
npm run build
npm start
```

## Build

בניית האתר:

```bash
cd client
npm run build
```

בניית השרת:

```bash
cd server
npm run build
```

## Deploy

ה-client מוגדר ל-Netlify:

- build base: `client`
- build command: `npm run build`
- publish directory: `client/dist`

בקובץ `netlify.toml` יש redirect מ-`/api/*` אל שרת Railway:

```text
https://chabad-yafo-production.up.railway.app/api/:splat
```

השרת עצמו מיועד לריצה בנפרד, למשל Railway, עם משתני הסביבה של `server`.

## מבנה API עיקרי

השרת חושף נתיבים תחת `/api`, כולל:

- `/api/health`
- `/api/shabbat`
- `/api/families`
- `/api/admin`
- `/api/auth`
- `/api/payment`
- `/api/rebbe-letters`
- `/api/daycare-registrations`
- `/api/daycare-enrollments`

## הערות תחזוקה

- קבצי build כמו `dist/` לא אמורים להיכנס ל-Git.
- קבצי מערכת כמו `.DS_Store` לא אמורים להיכנס ל-Git.
- לפני העלאה לפרודקשן כדאי להריץ `npm run build` ב-`client` וב-`server`.
- אחרי שינוי בנתיבי API או כתובת שרת, לבדוק גם את `netlify.toml` וגם את `VITE_API_URL`.
