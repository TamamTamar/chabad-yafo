# תוכנית פריסה — 15.10.2026

## מצב האישור

שלב 1 אושר ובוצע: נעילת הפריסה הפעילה ב־Netlify למניעת פרסום אוטומטי.
בממשק אומתו `Published & locked` ו־`Unlock to start auto publishing`.
הפריסה הפעילה נשארה `6ac3819da2e0320008261aa1` מה־commit `9254dad`.
לאחר הנעילה האתר, www ו־`/api/health` החזירו HTTP 200 ותוכן זהה לבסיס.
בניות בעקבות Push יכולות להמשיך, אך לא יתפרסמו אוטומטית בזמן הנעילה.
בהמשך אושרו הוספת שקופית שפרה ופועה, Commit, Push רגיל והמתנה לפריסת Railway.
פרסום הלקוח ב־Netlify ושחרור הנעילה עדיין דורשים אישור נוסף.
בסיום ההעלאה המלאה יש להחזיר את הפרסום האוטומטי למצבו המקורי — פעיל.

## ממצאים שאומתו

- נוצר snapshot פרטי של השינויים המקומיים ב־`/private/tmp/chabad-predeploy-2026-10-15`:
  patches, עותקי קבצים חדשים ו־SHA256. לא בוצעו checkout/reset/merge/stash.
- לאחר `git fetch origin`, גם `main` המקומי וגם `origin/main` מצביעים על
  `9254dadcf317e6c7d9bb40cd9d75bfaf84d461ee`; ahead/behind הם 0/0.
  יש לחזור על הבדיקה מיד לפני Push. אם remote התקדם, לעצור ולמזג/לבדוק מחדש.
- ה־deployment הפעיל ב־Railway הוא `5428333a-0c25-4183-a74b-e0ab77be06c4`,
  סטטוס SUCCESS, מה־commit לעיל. זהו יעד rollback של השרת כפי שנקרא כעת.
- ב־Netlify אומת הפרויקט `chabadyaffo` בדומיין `chabadyafo.org`, המחובר
  לאותו repository. הפריסה המסומנת Currently published היא
  `6ac3819da2e0320008261aa1`, מהענף `main` וה־commit `9254dad`.
  זהו יעד rollback של הלקוח. בשלב 1 הפריסה ננעלה בלי להחליף אותה.
- Netlify: production branch הוא `main`, בנייה אוטומטית Active והפרסום
  האוטומטי היה פעיל במקור; כעת נעול ומוצג `Unlock to start auto publishing`.
  Node מוגדר 22.x, והלוג של הפריסה הפעילה מאשר **22.23.3**.
- בממשק Netlify בסיס הפרויקט מוצג `/`, אך הלוג מאשר override מקובץ
  `/opt/build/repo/netlify.toml`: תיקיית עבודה `/opt/build/repo/client`,
  build command `npm run build`, ו־publish path `client/dist`.
  אין צורך לשנות הגדרות בסיס או פקודות בענן לצורך הפריסה.
- משתני הלקוח הקיימים ב־Netlify נוכחים לכל ההקשרים: `VITE_API_URL`,
  `VITE_META_PIXEL_ID`, `VITE_NEDARIM_API_VALID`, `VITE_NEDARIM_CALLBACK`,
  `VITE_NEDARIM_MOSAD`. ערך Production של `VITE_API_URL` אומת כ־`/api`.
  ערכים רגישים לא נחשפו ולא שונו. לפיתוחים החדשים אין משתנה לקוח חדש דרוש.
- Railway מחובר ל־`TamamTamar/chabad-yafo`, ענף `main`.
  Auto-deploy מופעל, ו־Wait for CI אינו מופעל. Push ל־main אינו פעולה מבודדת
  מהאתר: הוא יכול להתחיל פריסת שרת. לא שינינו הגדרה זו.
- תיקיית השירות `/server`, builder מסוג RAILPACK,
  build: `npm install && npm run build`, start: `npm start`.
  ה־build הפעיל פתר Node לגרסה **22.23.2**, המתאימה לתלויות שנבדקו.
  אין healthcheckPath מוגדר בשירות. לא שונו build/start/healthcheck.
- משתני Railway קיימים: `MONGO_URI`, `JWT_SECRET`, `CLIENT_ORIGIN`, `NODE_ENV`,
  `PORT`, `PUBLIC_API_URL`, ארבעת משתני Twilio הדרושים בתצורה הקיימת,
  וקבוצת פרטי האחסון הפרטי. `NODE_ENV=production`; לא נחשפו ערכים רגישים.
  שני הדומיינים הציבוריים של האתר נכללים ברשימות ה־origin המובנות בקוד.
- `MAFTIR_YONA_OUTBID_WEBHOOK_URL` חסר ב־Railway. קוד ההתראות ל־Make יעלה,
  אך השליחה תישאר כבויה. אין להוסיף את המשתנה או לשלוח הודעת ניסיון בלי
  אישור נפרד; לא נבדקה מסירה אמיתית ל־Make. זה נפרד מניסוי Meta המוחרג.
- בחיבור קריאה בלבד למסד הפעיל אומתו הרשאות אפקטיביות `createIndex`,
  `createCollection`, `listIndexes`, `find`. האינדקס הייחודי על `(phone,birthDate)`
  באוסף שפרה ופועה כבר קיים; מספר קבוצות הכפילויות שנמדד הוא 0.
  לא נוצרו אינדקסים ולא שונו נתונים בבדיקה.
- קריאת HTML ו־JavaScript הציבוריים של האתר הפעיל הראתה שהלקוח המפורסם
  משתמש ב־`/api` יחסי. הדבר תואם ל־proxy ולבדיקת same-origin של mutations.
  אין בכך אימות של משתני build אחרים ב־Netlify או של build עתידי.
- בחבילת מקור נקייה ללא קובצי סביבה וניסויים: 146 בדיקות שרת עברו ללא
  כשל/דילוג; בדיקות לקוח, lint ובניית TypeScript/Vite עברו. התלויות בשני
  package.json תואמות ל־lockfiles. אין תוספת תלות עבור הפריסה הנוכחית.

## גיבוי, הרשאות וגבולות הבדיקה

- גיבוי חדש מ־15.10.2026 הושלם לאחר אישור המשתמש בקריאה בלבד של מסד היישום.
  הוא נשמר ב־`backups/mongodb/predeploy-2026-10-15/database.archive.gz`,
  תיקייה 0700 וקובץ 0600, המוחרגים מ־Git. אומת SHA256.
  שחזור למסד מקומי חדש עבר ללא שגיאות: 36 אוספים, 390 מסמכים,
  ספירות ואינדקסים תואמים ללא הבדלים שנמצאו. תהליך השחזור הופסק
  והנתונים המקומיים הזמניים הוסרו; הגיבוי הפרטי נשמר מחוץ לשרת היישום.
- חסמי ההרשאה הראשוניים לקריאת Chrome ולגיבוי נפתרו באישור מפורש.
  המשתמש אישר גם קריאת שמות החלונות ובחירת Netlify בלבד מתפריט החלונות;
  כך הושלמה בדיקת Netlify. לאחר אישור נוסף בוצעה נעילת פרסום בלבד ב־Netlify; Railway לא שונה.
- גיבוי mongodump לוגי אינו הוכחה ל־snapshot אטומי בין אוספים תחת כתיבות
  מקבילות, ואינו מספק שחזור נקודתי/PITR. בדיקת השחזור מאשרת את הארכיון
  שנוצר, לא כותבת מחדש production ולא מכסה קבצים באחסון האובייקטים.
  אין מחיקות/שינוי מבנה הרסני מתוכננים; rollback של קוד אינו כולל שחזור DB.
- אם חולף זמן משמעותי עד הפריסה, לרענן את הגיבוי המאושר ולבדוק אותו שוב.
  גיבויים נשארים מחוץ ל־Git. אין להפעיל את היישום מול מסד השחזור.
- הפעלת webhook מפטיר יונה ל־Make נשארת כבויה עד אישור הגדרה ובדיקת
  מסירה נפרדים. קוד ניסויי Cardcom/Meta אינו חלק מהחבילה.
- הרשאות האינדקס ומצבו אומתו בקריאה בלבד. בדיקות שינויים וניתוקים נעשו
  רק במסדים מבודדים. לא בוצעה בדיקת עומס או בדיקת כתיבה בייצור.

## תוספת שאושרה לפני Commit

- נוספה רק שקופית שפרה ופועה ב־Hero הקיים, ללא שינוי השקופיות האחרות.
  כותרת: "ילדת לאחרונה? ארוחת בוקר מפנקת בדרך אלייך ❤️".
  הכפתור "לקבלת ארוחת בוקר" מקשר ל־`/shifra-pua`.
  תמונות קיימות: breakfast-hero למחשב ו־breakfast-hero-768 למובייל.
- אומתה התצוגה ב־1440×1000 וב־390×844, כולל ניווט הכפתור לטופס המקומי.
  צילומי הבדיקה נשמרו מחוץ למאגר. Build, lint ובדיקות לקוח עברו בחבילה נקייה;
  גם Build ו־146 בדיקות שרת עברו שוב עם MongoDB מקומי מבודד, ללא דילוגים.
- לאחר Push יש להמתין ל־Railway ולאמת MongoDB ואתחול שפרה ופועה.
  אין לפרסם עדיין את לקוח Netlify, ואין לשחרר נעילה.

## בדיקה אחרונה לפני ביצוע

- לאמת שוב ש־origin/main עדיין בבסיס `9254dad` וש־staging תואם לרשימה
  המפורשת להלן. אם יש שינוי מרוחק או מקומי נוסף — לעצור, לסקור ולבדוק.
- לא לשנות כעת Node, משתני סביבה, build/start commands, MongoDB timeouts,
  connection pool או retry. ההגדרות הקיימות אומתו לצורך החבילה הנוכחית.
- להציג לאישור את הקבצים, תוכנית הפרסום ויעדי ה־rollback. אין לפרוס או
  לבצע Push עד לאישור הביצוע המפורש של המשתמש.

## פעולות המשפיעות על האתר — רק אחרי אישור נוסף

1. **בוצע באישור המשתמש:** נעילת הפריסה הנוכחית ב־Netlify באמצעות `Lock to stop auto publishing`, אחרי
   אימות שהפעולה משאירה את הגרסה הפעילה זמינה ומונעת פרסום אוטומטי חדש.
   builds יכולים להמשיך, אך הלקוח החדש לא יפורסם לפני השרת.
   אין לבצע שלב זה לפני אישור מפורש, ואין להמשיך אם מצב הנעילה אינו מאומת.
2. ליצור Commit מה־staging שנבדק, לאחר אישור Commit; לרשום SHA.
   להריץ Fetch והשוואה נוספת מול origin/main. אם נוספו שינויים מרוחקים, לעצור.
3. לאחר אישור Push/Deploy מפורש, לבצע Push רגיל ללא force ל־main.
   Railway יתחיל לפרוס את אותו SHA. Netlify רשאי לבנות, אך נשאר נעול על
   הלקוח הקיים. אין להשתמש ב־railway up מהתיקייה המקומית המכילה ניסויים.
4. להמתין ל־Railway SUCCESS של SHA היעד, לאמת אתחול ואינדקסים דרך לוגים
   מסוננים, תקינות HTTP וקריאת DB מורשית. `/api/health` לבדו אינו בדיקת DB.
   אין פעולות כתיבה ניסיוניות, ניתוקים, תשלומים או הודעות בייצור.
5. רק לאחר אימות השרת: לפרסם במפורש ב־Netlify את build הלקוח מאותו SHA.
   לאמת מהדורת frontend, עמוד שפרה, הרשאות אדמין, API וניווט במובייל.
   אין להריץ טופסי ניסיון כנגד מסד הייצור.
6. לאחר אימות משולב ובהתאם לאישור שלב הפרסום: להחזיר auto-publishing למצבו המקורי — פעיל — ולנטר.
   פרטי החיבור, timeouts ומנגנוני retry נשארים ללא שינוי.

## תלויות ו־rollback

- שפרה: מודל + validation + routes + index/startup בשרת לפני טופס/אדמין בלקוח.
- מפטיר: שרת חדש תומך בלקוח הישן; consent חסר הוא false. אין לשלוח קודם
  את הלקוח החדש לשרת הישן. השדה החדש במודל הוא תוספתי.
- מעטפת אדמין: AdminShell/AdminNavigation/AdminPageHeader, tokens וכל עדכוני
  הנתיבים והמסכים חייבים להיכלל יחד. Header דורש את contact.ts החדש.
- כספי המעון: hook, view ובדיקות הסנכרון עולים יחד; אין שינוי API נדרש.
- אם השרת נכשל: אין לפרסם לקוח חדש. יש לעצור ולבדוק לפני כל rollback.
- אם הלקוח נכשל לאחר שהשרת הצליח: להחזיר את פריסת Netlify הקודמת.
  התאימות של השרת ללקוח הישן מאפשרת להשאירו בזמן הבדיקה.
- שחזור מסד הוא פעולה נפרדת ומסוכנת מבחינת כתיבות שנוספו מאז הגיבוי;
  אין לבצעו אוטומטית או כחלק מ־rollback של קוד. נדרש אישור ותכנון נפרדים.

## קובצי ה־Commit המיועדים

הרשימה כוללת את הפיתוחים שנבדקו, בדיקות ותיעוד; ניסויי Cardcom/Meta,
סקריפטי הודעות חד־פעמיים, נתוני production, קובצי `.env`, צילומי מסך,
build output, uploads וגיבויים אינם כלולים. קובצי הניסוי נשארים מקומית.
שתי תמונות WebP של שפרה הן נכסי האתר שנבדקו, ולא צילומי מסך.
מספרי קשר ציבוריים מכוונים ונתוני בדיקה סינתטיים בקוד אינם ייצוא מסד.

מספר קבצים: **90**.

```text
.gitignore
client/package.json
client/public/shifra-pua/breakfast-hero-768.webp
client/public/shifra-pua/breakfast-hero.webp
client/public/sitemap.xml
client/scripts/test-admin-navigation.mjs
client/scripts/test-admin-regressions.mjs
client/scripts/test-chat-assistant.mjs
client/scripts/test-daycare-finance.mjs
client/scripts/test-maftir-diagnostics.mjs
client/scripts/test-registration-resilience.mjs
client/src/app/Root.tsx
client/src/app/router.tsx
client/src/components/AdminNavigation/AdminNavigation.module.scss
client/src/components/AdminNavigation/AdminNavigation.tsx
client/src/components/AdminNavigation/adminNavigationConfig.ts
client/src/components/AdminShell/AdminPageHeader.module.scss
client/src/components/AdminShell/AdminPageHeader.tsx
client/src/components/AdminShell/AdminShell.module.scss
client/src/components/AdminShell/AdminShell.tsx
client/src/components/ChatAssistant/ChatAssistant.tsx
client/src/components/Header/Header.tsx
client/src/components/Header/HeaderDesktopNav.tsx
client/src/components/Header/HeaderMobileNav.tsx
client/src/components/Hero/Hero.tsx
client/src/components/ProtectedRouteAdmin/ProtectedRouteAdmin.tsx
client/src/config/contact.ts
client/src/pages/Admin/ArbaatHaminimAdmin/ArbaatHaminimAdmin.tsx
client/src/pages/Admin/DaycareAdmin/DaycareAdmin.module.scss
client/src/pages/Admin/DaycareAdmin/DaycareAdmin.tsx
client/src/pages/Admin/DaycareAdmin/components/DaycareDashboard.tsx
client/src/pages/Admin/DaycareAdmin/components/DaycareDonationsAdmin.module.scss
client/src/pages/Admin/DaycareAdmin/components/DaycareDonationsAdminView.tsx
client/src/pages/Admin/DaycareAdmin/components/DaycareFinanceView.tsx
client/src/pages/Admin/DaycareAdmin/components/DaycareParentDocuments.tsx
client/src/pages/Admin/DaycareAdmin/components/DaycareRegistrations.tsx
client/src/pages/Admin/DaycareAdmin/components/DaycareRegistrationsView.tsx
client/src/pages/Admin/DaycareAdmin/components/DaycareTasksView.tsx
client/src/pages/Admin/DaycareAdmin/components/DonationOverviewAdminView.tsx
client/src/pages/Admin/DaycareAdmin/components/useDaycareFinance.ts
client/src/pages/Admin/DaycareOnboarding/DaycareOnboardingAdmin.module.scss
client/src/pages/Admin/DaycareOnboarding/DaycareOnboardingAdmin.tsx
client/src/pages/Admin/DaycareOnboarding/components/OnboardingOverview.tsx
client/src/pages/Admin/MaftirYonaAdmin/MaftirYonaAdmin.module.scss
client/src/pages/Admin/MaftirYonaAdmin/MaftirYonaAdmin.tsx
client/src/pages/Admin/ShifraPuaAdmin/ShifraPuaAdmin.module.scss
client/src/pages/Admin/ShifraPuaAdmin/ShifraPuaAdmin.tsx
client/src/pages/AdminDashboard/AdminDashboard.module.scss
client/src/pages/AdminDashboard/AdminDashboard.tsx
client/src/pages/AdminDashboard/components/AdminProjectsTab/AdminProjectsTab.module.scss
client/src/pages/AdminDashboard/components/AdminProjectsTab/AdminProjectsTab.tsx
client/src/pages/MaftirYona/components/BidderDetailsForm.module.scss
client/src/pages/MaftirYona/components/BidderDetailsForm.tsx
client/src/pages/MaftirYona/useBidForm.ts
client/src/pages/ShifraPua/ShifraPua.module.scss
client/src/pages/ShifraPua/ShifraPua.tsx
client/src/services/chatAnalytics.ts
client/src/services/chatAssistantService.ts
client/src/services/googleAnalyticsService.ts
client/src/services/maftirYonaService.ts
client/src/services/shifraPuaService.ts
client/src/styles/_admin-tokens.scss
client/src/types/shifraPua.ts
client/src/utils/auctionRequestDiagnostics.ts
docs/chat-assistant.md
docs/deployment-plan-2026-10-15.md
docs/maftir-yona.md
docs/mongodb-connection-diagnostics.md
docs/release-readiness-2026-10-15.md
docs/shifra-pua.md
server/package.json
server/scripts/test-local-database.mjs
server/src/config/connectDB.ts
server/src/config/mongoConnectionDiagnostics.ts
server/src/index.ts
server/src/models/MaftirYonaBid.ts
server/src/models/ShifraPuaRegistration.ts
server/src/routes/maftirYonaRoutes.ts
server/src/routes/shifraPuaRoutes.ts
server/src/services/maftirYonaNotificationService.ts
server/src/services/maftirYonaRules.ts
server/src/services/maftirYonaService.ts
server/src/services/shifraPuaValidation.ts
server/src/tests/auctionRequestDiagnostics.test.ts
server/src/tests/databaseResilience.test.ts
server/src/tests/maftirYonaNotification.test.ts
server/src/tests/maftirYonaRules.test.ts
server/src/tests/mongoConnectionDiagnostics.test.ts
server/src/tests/shifraPua.test.ts
server/src/utils/auctionRequestDiagnostics.ts
```

מקורות לפעולות הפרסום: [Railway autodeploys](https://docs.railway.com/deployments/github-autodeploys), [Netlify publishing controls](https://docs.netlify.com/deploy/deploy-overview/).
