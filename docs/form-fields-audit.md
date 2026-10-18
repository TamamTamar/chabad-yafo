# מערכת השדות — מיפוי והסבה הדרגתית

## ממצאי הסריקה לפני המימוש

נסרקו רכיבי TSX עם שדות native והגדרות Sass באתר הציבורי ובאדמין. הסריקה איתרה **64 קובצי TSX** עם input/select/textarea ו־**40 קובצי Sass** המזכירים שדות (כולל משתנים ובסיס).

הגורם העיקרי לחוסר האחידות הוא הגדרה עצמאית של שדות בכל CSS Module: גבהים 40/42/44/48/56px, רדיוסים 8/10/11/14/16px, משקלי טקסט שונים, וצבעי גבול ומצבי פוקוס שאינם נובעים מחוזה משותף. מופיעים גם סגנונות נפרדים ל־inputError ול־textareaError והגדרות חוזרות של אותו selector בקבצים ארוכים.

### שכבות התשתית הקיימות

- `_variables.scss`: צבעי מותג ו־UI, רדיוסים 10/14px וטיפוגרפיה כללית (`$type-input: .92rem`). אינו מגדיר מערכת שדות, ולכן מסכים מפרשים את הערכים אחרת.
- `_base.scss`: reset של box-sizing, פונט Assistant, כיוון RTL, הגבלות רוחב במובייל. אין בו עיצוב שדות גלובלי. `!important` בו משמש לכיבוד reduced-motion בלבד.
- `_admin-tokens.scss`: משותף למעטפת האדמין; צבעים, משטחים ורדיוס 8px, אך אין מפרט שדות. `AdminShell.module.scss` מוסיף focus-visible לכל סוגי הקלט, ולכן הוא מתחרה בפוקוס המקומי של מסכים.
- CSS Modules: רוב העיצוב המקומי, לרבות selectors צאצאים כגון `.fields input` ו־`.page select` לצד מחלקות כגון `.input`, `.fieldInput`, `.profileInput`. ייבוא `_variables` אינו מונע כפילות של החוקים עצמם.

### כפילויות, דריסות ומעטפות

- ציבורי שפרה ופועה: גובה 48px, תוויות 700, פוקוס זהב 3px לעומת 2px כחול באדמין.
- תרומות / DonationDetailsStep: שדות 56px ורדיוס 16px; שלב סכום תרומה מוסיף focus shadow של 4px וריווח נפרד לסמל המטבע.
- DaycareContactFields: ריווח 11px/13px, משקל 650, פוקוס זהב עם shadow, הודעות עם min-height קבוע גם כאשר ריקות.
- DaycareAdmin: בסיס `.input` בגובה 42px וחריגות בחיפוש, בטפסי onboarding ובמובייל; קובץ גדול המכיל כמה שכבות סגנון.
- DaycareOnboardingAdmin: שדות 44px ורדיוס 11px; שדות קישור ו-dialog מוסיפים הגדרות נפרדות.
- AdminProjectsTab ו־MaftirYona: selectors חוזרים בהמשך אותו קובץ; נדרשת הסבה של כל ההגדרות יחד ולא הוספת override נוסף בסוף.
- שפרה ופועה באדמין לפני הפיילוט: בסיס `.page input/select/textarea`, חריגות לרקעים/משקלים של בחירת מנות וגודל 26px ל-checkbox; fieldset עם מסגרת בתוך card, מסגרת נוספת לכל שורת רשימה ולכל מצרך.
- לא כל עטיפה מיותרת: עטיפות מטבע וחיפוש ממקמות אייקונים, fieldset מפעיל disabled עבור קבוצה, label מקשר שם נגיש, grids ו-details נדרשים לפריסה ולגילוי פרטים. הן נשמרו.
- `!important` המשפיע על שדות: Shabbat מגדיר כך גבולות Error/Success; DaycareFieldUpdates כופה flex/gap על תווית, DaycareDonations כופה display; `.hint` הציבורי של שפרה ופועה כופה גודל. שאר השימושים שנמצאו הם בעיקר כותרות, הדפסה, ניווט ותנועה מופחתת. בפיילוט אין `!important` חדש.

### התנהגויות שחייבים לשמר בהסבה

- react-hook-form: שבת, משפחות, מכתב לרבי, שפרה ופועה הציבורי, תרומות, Campaign, רישום/קליטת מעון והסכמים. `register` מעביר ref, name, onChange/onBlur וולידציות; אין לעטוף/להחליף אותם ברכיב React לצורך עיצוב.
- תאריכים native: תאריך לידה, מסירה, יום רביעי לתכנון, מועדי מסמכים. שומרים min/max/required ואת ולידציית יום רביעי.
- שפרה ופועה: רשימות נשמרות ב-blur; checkbox נשמר מיד; ingredients/tasks/dressingIds דינמיים; כמות מספרית עם min/max/step; datalist של יחידות; שמירת תפריט דורשת preview ואישור ורוויזיה. אין שינוי בהן.
- תרומות/תשלום: סכום מטבע, תשלומים וסוג תרומה שייכים לזרימת תשלום. iframe נדרים וממשק חיצוני אינם מושפעים מ־CSS מקומי.
- מעון: קבצים, חתימת canvas, שורות אפוטרופוסים ומורשי איסוף, radio/checkbox והסכמות. אינם שדות טקסט ואין לתת להם גובה/appearance של input רגיל.
- אין כיום native select עם multiple בסריקה; התמיכה בתשתית מוכנה אך לא הוחלף ממשק בחירה קיים.

## התשתית החדשה

`client/src/styles/_form-fields.scss` הוא partial ללא CSS גלובלי. הוא מייצא `system(admin|public)`, `tokens`, `control`, `choice`, `label`, `message` ו־`icon-wrapper`. רק include מפורש בתוך מחלקת CSS Module מפעיל את העיצוב.

```scss
@use '../../../styles/form-fields' as fields;
.page { @include fields.system(admin); }
.searchInput { @include fields.icon-wrapper; }
.hint { @include fields.message; }
.fieldError { @include fields.message(error); }
```

באתר הציבורי ניתן לבחור `system(public)` באותו אופן: padding אופקי 12px ורווח label של 8px לעומת 10px ו־6px באדמין, עם צבע תווית חם יותר מהמותג. לשניהם שדה 40px במחשב, לפחות 44px וגופן 16px עד 640px, רדיוס 8px, גבול #D7DEE7 ורקע לבן ללא צל. textarea ובחירה מרובה מקבלים גובה תוכן עצמאי; checkbox/radio נשארים native עם accent-color ותווית בעלת אזור מגע של 44px במובייל.

מצבים: `aria-invalid=true` או `:user-invalid` לשגיאה; `data-field-state=success` להצלחה מפורשת (לא `:valid`, כדי שלא לצבוע שדה חובה שלא מולא/כל שדה תקין); `readonly` עם רקע עדין וגבול מקווקו; `:disabled` כולל fieldset disabled. פוקוס 2px בצבע המותג ב־focus-visible. הודעות שגיאה צריכות להישאר טקסטואליות ומקושרות דרך aria-describedby כאשר קיימות. הצלחה בתשתית אינה מוסיפה סטטוס עסקי חדש.

Native date/select, לחצני clear בחיפוש, autocomplete, inputMode, min/max, dir ו־ref נשמרים. תאריכים/טלפונים/אימייל ללא dir מפורש מוצגים ב־LTR; dir מפורש של השדה נשמר. אין שינוי לפונקציות JS, שמות שדות, API או נתונים.

## הפיילוט הפעיל

רק `.page` של ShifraPuaAdmin כולל `fields.system(admin)`:

- ShifraPuaAdmin: חיפוש, סטטוס, טווח תאריכים, תאריך חלוקה, עדכון הרשמה, פרטי היולדת/פונה והערות.
- WeeklyLists: תאריך שבוע, הוספת קניות/הכנות, עריכת שם/כמות/יחידה ו-checkbox ביצוע. שגיאת שם ריק קיימת מקבלת aria-invalid וקישור להודעה הקיימת.
- WeeklyMenu: שש בחירות המנות, סינון קטגוריה במאגר ושם תפריט מועדף. החריגות הצבעוניות של שדות הבחירה הוסרו; צבעי המסך נשארו במעטפות ובסטטוסים, והשדות עצמם משתמשים באותו בסיס לבן.
- RecipeEditor: שם, קטגוריה, מצרכים/מספרים/יחידות עם datalist, textarea והסכמות checkbox.

fieldset, label, details ומבנה ה־DOM הנדרש נשמרים. מעטפות עריכה, מצרכים ורשימות שוטחו לקווים מפרידים במקום כרטיס בתוך כרטיס; הוספת פריט מוצגת לצד כפתור בגודל שדה. מובייל מפרק שורות מצרכים לטור אחד. לא נוצרו רכיבי React ולא נוספו dependencies.

## מפת ההסבה הבאה — עדיין בעיצוב הישן

| קבוצת מסכים | בסיס/רכיבים להסבה | רגישויות |
|---|---|---|
| שפרה ופועה ציבורי | ShifraPua.module.scss | RHF, הסכמה, תאריך לידה ושגיאות נגישות |
| שבת, משפחות, מכתב לרבי | Shabbat; SurveyForm; RebbeLetterForm | RHF, radio/checkbox, הודעות הצלחה ושגיאה |
| רישום/הרשמה/קליטת מעון | DaycareRegistration; DaycareEnrollment; DaycareOnboarding | שדות חוזרים, radio, תאריכים, קבצים, חתימות והסכמות |
| תרומות וקמפיינים | DonationDetailsStep; CustomAmountField; PaymentsSelect; CampaignCompactForm; CampaignDonorFields; DaycareDonations | מטבע, סכומים, בחירה מותאמת, תשלומים וממשק ספק חיצוני |
| מאפטיר יונה וארבעת המינים ציבורי | MaftirYona; ArbaatHaminim | פרטי משתמש, סכומים ובחירות |
| כניסת אדמין | AdminLogin | autocomplete וסיסמה |
| ניהול מעון ותרומות | DaycareAdmin וכל רכיבי המשנה | inline save, מסננים, כספים, העלאות ושדות דינמיים |
| קליטת מעון באדמין | DaycareOnboardingAdmin ורכיביו | מסמכים, קישורים, הרשאות ותשלום |
| אדמין פרויקטים ותשלומים | AdminProjectsTab; AdminPaymentsTab; AdminRebbeLettersTab | טפסים/מסננים ואימותים עסקיים |
| אדמין מאפטיר/ארבעת המינים/הרשמות מעון | MaftirYonaAdmin; ArbaatHaminimAdmin; DaycareEnrollmentsAdmin | סוגי שדות שונים, שמירה ופעולות גבייה |
| רכיבים כלליים | ChatAssistant; ReasonDialog; ConfirmDialog | dialog בפורטל מחוץ ל-scope; הסבה מפורשת נפרדת |

כל אלו נשארים ללא שינוי. סדר מומלץ: שפרה ופועה ציבורי וטפסי קשר פשוטים, לאחר מכן אדמין נוסף אחד בכל פעם, ולבסוף תשלומים וטפסי המעון המורכבים. בכל הסבה יש להסיר את ההגדרות המקומיות הסותרות, לבדוק מצבים ומובייל ורק אז להרחיב scope. אין להוסיף include ל־_base או ל־AdminShell כדי להסב את כולם בבת אחת.

## תוצאות אימות הפיילוט

- `npm run build --prefix client`, `npm test --prefix client`, ESLint לשני קובצי TSX ששונו ו־`git diff --check` עברו.
- Sass: שני הווריאנטים מתקמפלים; ייבוא partial לבדו אינו מייצר selectors או declarations גלובליים (רק הערות המקור במצב expanded).
- בדפדפן: רכיבי המסך האמיתיים הורצו עם נתוני דוגמה ו־API מקומי מדומה בלבד, ללא מידע אמיתי וללא שרת/מסד נתוני הייצור. מעטפת הבדיקה טענה גם את כללי AdminShell כדי לבדוק התנגשות פוקוס.
- רוחב 1280px: input/select רגילים בגובה 40px, גופן 15px ומשקל 400; רקע לבן, border #D7DEE7 וללא shadow. גבול ופוקוס ממוקד בצבע המותג, outline של 2px.
- רוחב 390px: שדות רגילים בגובה 44px וגופן 16px; checkbox בגודל 20px בתוך תוויות שגובהן לפחות 44px. רוחב התוכן נשאר 390px ללא גלישה אופקית גם עם שם פריט ארוך.
- נבדקו עריכת הרשמה, שדות הסינון והתאריכים, שורת קניות פתוחה, שם פריט ריק והודעת השגיאה המקושרת, ניווט Tab, עריכת מתכון והוספת מצרך דינמי. required מקורי בדפדפן ממשיך לעצור שליחה ולסמן את השדה.
- Error, Success, Disabled, Readonly, textarea, radio ובחירה מרובה נבדקו גם במתקן הדגמה זמני המשתמש באותו CSS, משום שחלק מהסוגים/המצבים אינם מופיעים כיום במסך. לא נוספו למסך שדות, נתונים או סטטוסים עסקיים חדשים.
- textarea נשאר בגובה עצמאי לפי rows (88px לפחות), ובחירה מרובה 104px לפחות; לא קיבלו גובה קשיח של שדה טקסט.

## נספח — קובצי הסגנונות שנמצאו בסריקה

- `client/src/components/AdminShell/AdminShell.module.scss`
- `client/src/components/ChatAssistant/ChatAssistant.module.scss`
- `client/src/components/ConfirmDialog/ConfirmDialog.module.scss`
- `client/src/components/ReasonDialog/ReasonDialog.module.scss`
- `client/src/pages/Admin/ArbaatHaminimAdmin/ArbaatHaminimAdmin.module.scss`
- `client/src/pages/Admin/DaycareAdmin/DaycareAdmin.module.scss`
- `client/src/pages/Admin/DaycareAdmin/components/DaycareAgreements.module.scss`
- `client/src/pages/Admin/DaycareAdmin/components/DaycareAmbassadorsAdmin.module.scss`
- `client/src/pages/Admin/DaycareAdmin/components/DaycareDonationLeadsAdmin.module.scss`
- `client/src/pages/Admin/DaycareAdmin/components/DaycareDonationsAdmin.module.scss`
- `client/src/pages/Admin/DaycareAdmin/components/DaycareFieldUpdatesAdmin.module.scss`
- `client/src/pages/Admin/DaycareAdmin/components/DaycareParentDocuments.module.scss`
- `client/src/pages/Admin/DaycareAdmin/components/DonationAllocationDialog.module.scss`
- `client/src/pages/Admin/DaycareEnrollments/DaycareEnrollmentsAdmin.module.scss`
- `client/src/pages/Admin/DaycareOnboarding/DaycareOnboardingAdmin.module.scss`
- `client/src/pages/Admin/ShifraPuaAdmin/ShifraPuaAdmin.module.scss`
- `client/src/pages/AdminDashboard/components/AdminPaymentsTab/AdminPaymentsTab.module.scss`
- `client/src/pages/AdminDashboard/components/AdminProjectsTab/AdminProjectsTab.module.scss`
- `client/src/pages/AdminLogin/AdminLogin.module.scss`
- `client/src/pages/ArbaatHaminim/ArbaatHaminim.module.scss`
- `client/src/pages/Campaign/styles/_calculator.scss`
- `client/src/pages/Campaign/styles/_compact-form.scss`
- `client/src/pages/Campaign/styles/_modal.scss`
- `client/src/pages/DaycareDonations/DaycareDonations.module.scss`
- `client/src/pages/DaycareEnrollment/DaycareEnrollment.module.scss`
- `client/src/pages/DaycareOnboarding/components/HealthDeclarationSection.module.scss`
- `client/src/pages/DaycareOnboarding/components/PickupAuthorizationSection.module.scss`
- `client/src/pages/DaycareRegistration/components/DaycareContactFields/DaycareContactFields.module.scss`
- `client/src/pages/DaycareRegistration/components/DaycareNotesField/DaycareNotesField.module.scss`
- `client/src/pages/DaycareRegistration/components/DaycareRegistrationForm/DaycareRegistrationForm.module.scss`
- `client/src/pages/DonatePage/components/DonationForm/DonationAmountStep/CustomAmountField.module.scss`
- `client/src/pages/DonatePage/components/DonationForm/DonationAmountStep/PaymentsSelect.module.scss`
- `client/src/pages/DonatePage/components/DonationForm/DonationDetailsStep/DonationDetailsStep.module.scss`
- `client/src/pages/Families/components/SurveyForm/SurveyForm.module.scss`
- `client/src/pages/MaftirYona/MaftirYona.module.scss`
- `client/src/pages/Shabbat/Shabbat.module.scss`
- `client/src/pages/ShifraPua/ShifraPua.module.scss`
- `client/src/pages/WriteToRebbe/components/RebbeLetterForm/RebbeLetterForm.module.scss`
- `client/src/styles/_base.scss`
- `client/src/styles/_variables.scss`
