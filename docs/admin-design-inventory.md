# מיפוי תשתית האדמין - 18.10.2026

מיפוי סטטי מלא של קובצי התצוגה. המספרים הם מופעים בקוד, כולל ענפים מותנים; אינם מספר רכיבים שמוצגים יחד. נבדקו גם הטוקנים, controls, form-fields, המעטפת והתיעוד.

## מצב עדכני אחרי בדיקת האחידות

| תחום | חיבור למערכת | חריגות מכוונות |
|---|---|---|
| רישום ומדדים | מתאם מחלקות AdminUI, controls/patterns וטוקנים | טבלה צפופה, כרטיסי מובייל, בורר סטטוס וחלון פתיחת תיק ייעודיים |
| משימות והיערכות | מתאם AdminUI, AdminDialog, shared danger/navigation ותגיות | רשימת משימות, רכש, פעולות popover ומדדי היערכות |
| שבע לשוניות המסמכים | AdminUI, AdminEditor, AdminConfirmDialog | פריסות ושדות לפי מסמך; checkbox מקורי |
| כספים | AdminUI + controls.field-label | fieldset, סכומים ופריסה רספונסיבית |
| תרומות, שגרירים ועדכוני שטח | שבע הלשוניות הפעילות הוסבו ל־AdminUI | תהליכי תשלום ציבוריים נשארו מקוריים; רכיב הלידים הוסב אך אינו מחובר לממשק |
| יתר מסכי האדמין | טרם הוסבו במלואם | טוקנים או form-fields לבדם אינם Modern Dark |

אוחדו תוויות כספים, צבעי danger במנוחה וב־hover, מצב navigation פעיל במנוחה וב־hover ותג הרישום במובייל; ערכים זהים הוחלפו בטוקנים קיימים. `AdminDialog.module.scss` משתמש במשטח המשותף ובטוקנים, עם מידות חלון מקומיות מכוונות. לא נוצר עיצוב בסיס נוסף. הסבת התרומות מתועדת בסעיף העדכני להלן; רכיבי הבסיס הקיימים נוצלו ללא שינוי בברירות המחדל שלהם.

הטבלאות להלן הן מיפוי המקור שנאסף בסבבי ההסבה; סעיפי ההסבות והמצב העדכני לעיל גוברים על תיאורי עבר. בפרט, מחלקות finance הישנות כבר הוסרו מקובץ ההורה. פירוט החריגות והבדיקות ב־`admin-design.md`, בסעיף בדיקת האחידות הרוחבית.

## כל התצוגות

| תצוגה | input / select / textarea / button | dialog / table | סגנון |
|---|---|---|---|
| `components/AdminNavigation/AdminNavigation.tsx` | 0 / 0 / 0 / 2 | 0 / 0 | טוקני אדמין + מקומי |
| `components/AdminShell/AdminPageHeader.tsx` | 0 / 0 / 0 / 0 | 0 / 0 | טוקני אדמין + מקומי |
| `components/AdminShell/AdminShell.tsx` | 0 / 0 / 0 / 2 | 1 / 0 | טוקני אדמין + מקומי |
| `components/AdminUI/AdminDialog.tsx` | 0 / 0 / 0 / 0 | 1 / 0 | Modern Dark משותף |
| `components/AdminUI/AdminReasonDialog.tsx` | 0 / 0 / 0 / 0 | 0 / 0 | הרכבת AdminDialog + AdminTextarea + AdminButton |
| `components/AdminUI/AdminPrimitives.tsx` | 1 / 1 / 1 / 1 | 0 / 1 | Modern Dark משותף |
| `components/BaseDialog/BaseDialog.tsx` | 0 / 0 / 0 / 0 | 1 / 0 | מקומי / סגנון מההורה |
| `components/ConfirmDialog/ConfirmDialog.tsx` | 1 / 0 / 0 / 2 | 0 / 0 | מקומי / סגנון מההורה |
| `components/ReasonDialog/ReasonDialog.tsx` | 0 / 0 / 1 / 2 | 0 / 0 | מקומי / סגנון מההורה |
| `pages/Admin/ArbaatHaminimAdmin/ArbaatHaminimAdmin.tsx` | 2 / 0 / 1 / 2 | 0 / 0 | מקומי / סגנון מההורה |
| `pages/Admin/ArbaatHaminimAdmin/SaleCollectionEditor.tsx` | 1 / 0 / 1 / 3 | 0 / 0 | מקומי / סגנון מההורה |
| `pages/Admin/DaycareAdmin/DaycareAdmin.tsx` | 0 / 0 / 0 / 1 | 0 / 0 | טוקני אדמין + מקומי |
| `pages/Admin/DaycareAdmin/components/DaycareAgreements.tsx` | 1 / 0 / 0 / 0 | 0 / 0 | AdminUI + AdminEditor |
| `pages/Admin/DaycareAdmin/components/DaycareAmbassadorsAdmin.tsx` | 0 / 0 / 0 / 0 | 0 / 0 | AdminUI + פריסה מקומית |
| `pages/Admin/DaycareAdmin/components/DaycareAnnualPlan.tsx` | 0 / 0 / 0 / 0 | 0 / 0 | AdminUI + AdminEditor |
| `pages/Admin/DaycareAdmin/components/DaycareDashboard.tsx` | 0 / 0 / 0 / 0 | 0 / 0 | טוקני אדמין + מקומי |
| `pages/Admin/DaycareAdmin/components/DaycareDocuments.tsx` | 4 / 1 / 0 / 4 | 0 / 1 | מקומי / סגנון מההורה |
| `pages/Admin/DaycareAdmin/components/DaycareDonationLeadsAdmin.tsx` | 0 / 0 / 0 / 0 | 0 / 0 | AdminUI + פריסה מקומית (לא מחובר לממשק) |
| `pages/Admin/DaycareAdmin/components/DaycareDonationsAdmin.tsx` | 0 / 0 / 0 / 0 | 0 / 0 | AdminUI + פריסה מקומית |
| `pages/Admin/DaycareAdmin/components/DaycareDonationsAdminView.tsx` | 0 / 0 / 0 / 0 | 0 / 0 | AdminUI + פריסה מקומית |
| `pages/Admin/DaycareAdmin/components/DaycareExpansion.tsx` | 0 / 0 / 0 / 0 | 0 / 0 | Modern Dark משותף |
| `pages/Admin/DaycareAdmin/components/DaycareFieldUpdatesAdmin.tsx` | 2 / 0 / 0 / 0 | 0 / 0 | AdminUI + פריסה מקומית |
| `pages/Admin/DaycareAdmin/components/DaycareFinance.tsx` | 0 / 0 / 0 / 0 | 0 / 0 | מקומי / סגנון מההורה |
| `pages/Admin/DaycareAdmin/components/DaycareFinanceView.tsx` | 0 / 0 / 0 / 0 | 0 / 0 | AdminInput / AdminSelect / AdminButton / AdminCard / AdminBadge |
| `pages/Admin/DaycareAdmin/components/DaycareParentDocuments.tsx` | 0 / 0 / 0 / 0 | 0 / 0 | AdminUI + AdminEditor |
| `pages/Admin/DaycareAdmin/components/DaycareRegistrations.tsx` | 0 / 0 / 0 / 0 | 0 / 0 | מקומי / סגנון מההורה |
| `pages/Admin/DaycareAdmin/components/DaycareRegistrationsView.tsx` | 5 / 4 / 1 / 4 | 1 / 1 | Modern Dark משותף |
| `pages/Admin/DaycareAdmin/components/DaycareTasks.tsx` | 0 / 0 / 0 / 0 | 0 / 0 | מקומי / סגנון מההורה |
| `pages/Admin/DaycareAdmin/components/DaycareTasksView.tsx` | 7 / 3 / 0 / 7 | 0 / 0 | Modern Dark משותף |
| `pages/Admin/DaycareAdmin/components/DonationAllocationDialog.tsx` | 0 / 0 / 0 / 0 | 0 / 0 | AdminUI + פריסה מקומית |
| `pages/Admin/DaycareAdmin/components/DonationItemsAdminView.tsx` | 0 / 0 / 0 / 0 | 0 / 0 | AdminUI + פריסה מקומית |
| `pages/Admin/DaycareAdmin/components/DonationManualAdminView.tsx` | 1 / 0 / 0 / 0 | 0 / 0 | AdminUI + פריסה מקומית |
| `pages/Admin/DaycareAdmin/components/DonationOverviewAdminView.tsx` | 1 / 0 / 0 / 0 | 0 / 0 | AdminUI + פריסה מקומית |
| `pages/Admin/DaycareAdmin/components/DonationRecordsAdminView.tsx` | 0 / 0 / 0 / 0 | 0 / 0 | AdminUI + פריסה מקומית |
| `pages/Admin/DaycareAdmin/components/TaskActionsPopover.tsx` | 0 / 0 / 0 / 2 | 0 / 0 | Modern Dark משותף |
| `pages/Admin/DaycareAdmin/components/useDaycareRegistrations.tsx` | 0 / 0 / 1 / 0 | 0 / 0 | Modern Dark משותף |
| `pages/Admin/DaycareEnrollments/DaycareEnrollmentsAdmin.tsx` | 1 / 2 / 0 / 2 | 0 / 1 | מקומי / סגנון מההורה |
| `pages/Admin/DaycareOnboarding/DaycareOnboardingAdmin.tsx` | 0 / 0 / 0 / 1 | 0 / 0 | מקומי / סגנון מההורה |
| `pages/Admin/DaycareOnboarding/components/DocumentReviewSections.tsx` | 0 / 3 / 3 / 8 | 0 / 0 | מקומי / סגנון מההורה |
| `pages/Admin/DaycareOnboarding/components/OnboardingControls.tsx` | 1 / 0 / 1 / 5 | 0 / 0 | מקומי / סגנון מההורה |
| `pages/Admin/DaycareOnboarding/components/OnboardingDialogs.tsx` | 1 / 0 / 0 / 4 | 0 / 0 | מקומי / סגנון מההורה |
| `pages/Admin/DaycareOnboarding/components/OnboardingOverview.tsx` | 0 / 0 / 0 / 2 | 0 / 0 | מקומי / סגנון מההורה |
| `pages/Admin/DaycareOnboarding/components/OperationalStepsSection.tsx` | 2 / 3 / 2 / 4 | 0 / 0 | מקומי / סגנון מההורה |
| `pages/Admin/DaycareOnboarding/components/TuitionPaymentAdmin.tsx` | 1 / 0 / 0 / 1 | 0 / 0 | מקומי / סגנון מההורה |
| `pages/Admin/MaftirYonaAdmin/MaftirYonaAdmin.tsx` | 2 / 0 / 0 / 9 | 0 / 0 | מקומי / סגנון מההורה |
| `pages/Admin/ShifraPuaAdmin/RecipeEditor.tsx` | 7 / 1 / 2 / 4 | 0 / 0 | form-fields + מקומי |
| `pages/Admin/ShifraPuaAdmin/ShifraPuaAdmin.tsx` | 11 / 2 / 2 / 11 | 0 / 0 | form-fields + מקומי |
| `pages/Admin/ShifraPuaAdmin/WeeklyLists.tsx` | 4 / 0 / 0 / 5 | 0 / 0 | form-fields + מקומי |
| `pages/Admin/ShifraPuaAdmin/WeeklyMenu.tsx` | 1 / 2 / 0 / 15 | 0 / 0 | form-fields + מקומי |
| `pages/AdminDashboard/AdminDashboard.tsx` | 0 / 0 / 0 / 0 | 0 / 0 | מקומי / סגנון מההורה |
| `pages/AdminDashboard/components/AdminDaycareRegistrationsTab/AdminDaycareRegistrationsTab.tsx` | 0 / 0 / 0 / 0 | 0 / 1 | מקומי / סגנון מההורה |
| `pages/AdminDashboard/components/AdminFamiliesTab/AdminFamiliesTab.tsx` | 0 / 0 / 0 / 0 | 0 / 1 | מקומי / סגנון מההורה |
| `pages/AdminDashboard/components/AdminPaymentsTab/AdminPaymentsTab.tsx` | 4 / 2 / 1 / 4 | 0 / 2 | מקומי / סגנון מההורה |
| `pages/AdminDashboard/components/AdminProjectsTab/AdminProjectsTab.tsx` | 7 / 5 / 2 / 24 | 0 / 0 | טוקני אדמין + מקומי |
| `pages/AdminDashboard/components/AdminRebbeLettersTab/AdminRebbeLettersTab.tsx` | 0 / 1 / 0 / 0 | 0 / 1 | מקומי / סגנון מההורה |
| `pages/AdminLogin/AdminLogin.tsx` | 1 / 0 / 0 / 1 | 0 / 0 | מקומי / סגנון מההורה |

## משטחי card / badge / modal ומקורות CSS

| קובץ סגנון | מחלקות רלוונטיות | מקור |
|---|---|---|
| `components/AdminNavigation/AdminNavigation.module.scss` |  | admin-tokens |
| `components/AdminShell/AdminPageHeader.module.scss` |  | admin-tokens |
| `components/AdminShell/AdminShell.module.scss` |  | admin-tokens |
| `components/AdminUI/AdminDialog.module.scss` | dialog | משטח וטוקני AdminUI + מידות חלון מקומיות |
| `components/AdminUI/AdminPrimitives.module.scss` | badge, card, semanticStatus, stat, statLabel, statValue, table, tableViewport | admin-tokens |
| `components/BaseDialog/BaseDialog.module.scss` | card, dialog | מקומי |
| `components/ConfirmDialog/ConfirmDialog.module.scss` |  | מקומי |
| `components/ReasonDialog/ReasonDialog.module.scss` |  | מקומי |
| `pages/Admin/ArbaatHaminimAdmin/ArbaatHaminimAdmin.module.scss` | status | מקומי |
| `pages/Admin/DaycareAdmin/DaycareAdmin.module.scss` | emptyState, metricCard, modalActions, modalBackdrop, modalCloseButton, modalHeader, modalHint, modalTitle, onboardingModal, onboardingStatusLine, statusAttention, statusBadge, statusProgress, statusReady, statusSelect, table, tableCell, tableCompact, tableHeader, tableRow, tableWrapper | מקומי |
| `pages/Admin/DaycareAdmin/components/DaycareAmbassadorsAdmin.module.scss` | table, tableWrap | פריסת תרומות מקומית + בסיס AdminUI |
| `pages/Admin/DaycareAdmin/components/DaycareDashboard.module.scss` | status | admin-controls/patterns |
| `pages/Admin/DaycareAdmin/components/DaycareDonationLeadsAdmin.module.scss` | alertCard, leadCard, status | פריסת תרומות מקומית + בסיס AdminUI |
| `pages/Admin/DaycareAdmin/components/DaycareDonationsAdmin.module.scss` | emptyState, rateStatus, recordsTable, recordsTableWrap, stateMessage | פריסת תרומות מקומית + בסיס AdminUI |
| `pages/Admin/DaycareAdmin/components/DaycareFieldUpdatesAdmin.module.scss` | card, cardActions, cardContent, statusRow | פריסת תרומות מקומית + בסיס AdminUI |
| `pages/Admin/DaycareAdmin/components/DaycareRegistrations.module.scss` | emptyState, modalActions, modalBackdrop, modalCloseButton, modalHeader, modalHint, modalTitle, onboardingModal, onboardingStatusLine, registrationCard, registrationCardHeader, registrationDesktopTable, registrationMobileStatus, status, statusControl, statusSelect, tableCell, tableCompact, tableHeader | admin-controls/patterns |
| `pages/Admin/DaycareAdmin/components/DaycareTasks.module.scss` | categoryBadge, deleteDialog, emptyState, lockedStatus, metricCard, priorityPill, taskCard, taskCardExpanded, taskCardHeader, taskCardMeta, taskCardTop, taskCards | admin-controls/patterns |
| `pages/Admin/DaycareAdmin/components/DonationAllocationDialog.module.scss` |  | פריסת תרומות מקומית + בסיס AdminUI |
| `pages/Admin/DaycareEnrollments/DaycareEnrollmentsAdmin.module.scss` | card, createDialogActions, createDialogError, createDialogHint, createDialogText, createOnboardingDialog, detailCard, modal, modalHeader, modalOverlay, statusSelect, table, tableWrapper | מקומי |
| `pages/Admin/DaycareOnboarding/DaycareOnboardingAdmin.module.scss` | agreementReviewCard, controlCard, dialogActions, dialogOverlay, dialogText, dialogTitle, freshLinkDialogField, headerCard, healthDeclarationCard, leaveDialog, linkControlCard, nextActionCard, stateMessage, statusBadge, stepCard | מקומי |
| `pages/Admin/MaftirYonaAdmin/MaftirYonaAdmin.module.scss` |  | מקומי |
| `pages/Admin/ShifraPuaAdmin/ShifraPuaAdmin.module.scss` | badge, card, cardHeader, cards, summaryCard | form-fields |
| `pages/AdminDashboard/AdminDashboard.module.scss` |  | מקומי |
| `pages/AdminDashboard/components/AdminDaycareRegistrationsTab/AdminDaycareRegistrationsTab.module.scss` | card, table, tableCell, tableHeader, tableRow, tableWrapper | מקומי |
| `pages/AdminDashboard/components/AdminFamiliesTab/AdminFamiliesTab.module.scss` | card, table, tableWrapper | מקומי |
| `pages/AdminDashboard/components/AdminPaymentsTab/AdminPaymentsTab.module.scss` | card, categoryTable, table, tableWrapper | מקומי |
| `pages/AdminDashboard/components/AdminProjectsTab/AdminProjectsTab.module.scss` | createCard, projectCard, statusPill, summaryCard, summaryCards | admin-tokens |
| `pages/AdminDashboard/components/AdminRebbeLettersTab/AdminRebbeLettersTab.module.scss` | card, statusSelect, table, tableWrapper | מקומי |
| `pages/AdminLogin/AdminLogin.module.scss` | card | מקומי |

## כפילויות מדויקות שנותרו

להלן בלוקים זהים בשני קבצים או יותר (כולל פריסה; אין להסיק שהם בעלי אותה התנהגות). כפילויות כפתורים/שדות בין הרישום למשימות הועברו למחלקות משותפות. וריאציות שאינן זהות נשארו מקומיות.

- `display: flex; align-items: flex-start; justify-content: space-between; gap: 16px;` - `pages/AdminDashboard/components/AdminPaymentsTab/AdminPaymentsTab.module.scss`
- `border: 1px solid $brand-primary; background: $brand-primary; color: $color-white;` - `pages/Admin/DaycareOnboarding/DaycareOnboardingAdmin.module.scss`
- `border: 1px solid $ui-border-strong; background: $brand-bg; color: $brand-primary;` - `pages/Admin/DaycareOnboarding/DaycareOnboardingAdmin.module.scss`
- `white-space: nowrap; background: rgba($brand-primary, 0.06); color: $brand-primary; font-size: $type-body-sm; font-weight: 900;` - `pages/Admin/DaycareEnrollments/DaycareEnrollmentsAdmin.module.scss`, `pages/AdminDashboard/components/AdminRebbeLettersTab/AdminRebbeLettersTab.module.scss`
- `overflow: hidden; border: 1px solid $ui-border-soft; border-radius: $radius; background: $brand-bg; box-shadow: 0 16px 40px $ui-shadow-card;` - `pages/AdminDashboard/components/AdminDaycareRegistrationsTab/AdminDaycareRegistrationsTab.module.scss`, `pages/AdminDashboard/components/AdminFamiliesTab/AdminFamiliesTab.module.scss`, `pages/AdminDashboard/components/AdminPaymentsTab/AdminPaymentsTab.module.scss`
- `white-space: nowrap; background: rgba($brand-primary, 0.06); color: $brand-primary; font-weight: 800;` - `pages/AdminDashboard/components/AdminDaycareRegistrationsTab/AdminDaycareRegistrationsTab.module.scss`, `pages/AdminDashboard/components/AdminFamiliesTab/AdminFamiliesTab.module.scss`, `pages/AdminDashboard/components/AdminPaymentsTab/AdminPaymentsTab.module.scss`
- `content: attr(data-label); color: $brand-primary; font-size: $type-caption; font-weight: 900;` - `pages/AdminDashboard/components/AdminDaycareRegistrationsTab/AdminDaycareRegistrationsTab.module.scss`, `pages/AdminDashboard/components/AdminFamiliesTab/AdminFamiliesTab.module.scss`, `pages/AdminDashboard/components/AdminPaymentsTab/AdminPaymentsTab.module.scss`, `pages/AdminDashboard/components/AdminRebbeLettersTab/AdminRebbeLettersTab.module.scss`
- `padding: 16px 18px; text-align: right; vertical-align: top; border-bottom: 1px solid $ui-border-soft;` - `pages/AdminDashboard/components/AdminFamiliesTab/AdminFamiliesTab.module.scss`, `pages/AdminDashboard/components/AdminPaymentsTab/AdminPaymentsTab.module.scss`
- `margin-bottom: 12px; overflow: hidden; border: 1px solid $ui-border-soft; border-radius: $radius-md; background: $brand-bg; box-shadow: 0 10px 24px $ui-shadow-card;` - `pages/AdminDashboard/components/AdminFamiliesTab/AdminFamiliesTab.module.scss`, `pages/AdminDashboard/components/AdminPaymentsTab/AdminPaymentsTab.module.scss`, `pages/AdminDashboard/components/AdminRebbeLettersTab/AdminRebbeLettersTab.module.scss`

## מסמכי המעון - הסבה בפועל (18.10.2026)

- הנתיב הפעיל `?tab=documents` מכיל welcome/routine/holidays/menu/equipment/annual-plan/agreements. כולם הוסבו; גם alias `?tab=agreements` ממשיך לעבוד.
- `DaycareDocuments.tsx` הוא רכיב ישן שאינו מחובר לנתב. מצבי חסר/בטיפול/קיים שבו אינם מצבי מסמכי ההורים הפעילים; הרכיב לא שונה ולא חובר מחדש. אין העלאת קובץ במסך הפעיל.
- רכיבים: AdminButton, AdminLink, AdminInput, AdminSelect, AdminTextarea, AdminBadge, AdminCard, AdminConfirmDialog שעוטף AdminDialog. חלונות פרסום/יצירת הסכם, שחרור נעילה ומחיקת תוכנית משתמשים באותו מחזור מיקוד משותף.
- `AdminEditor.module.scss` הוא פריסת עורכים משותפת ב־AdminUI, עם טוקנים קיימים בלבד; אינו מגדיר בסיס שדות/כפתורים/תגים/כרטיסים. שני קובצי ה־SCSS המקומיים של עורכי המסמכים נמחקו, וכן עיצוב ניווט המסמכים הישן שהתייתר.
- מקומי נשארו המרת שורות, ולידציה, חישוב לוח שנה, נעילה, שיתוף ופעולות API. checkbox אישור הבדיקה המשפטית נשאר native. לא שונו endpoints או payloads.
- שורות המיפוי לעיל סופרות פקדי native בלבד; רכיבי AdminUI אינם מופעי native נוספים במסך.

| תוספת משותפת | תפקיד |
|---|---|
| `components/AdminUI/AdminConfirmDialog.tsx` | הרכבת AdminDialog וכפתורי אישור/ביטול למסמכים |
| `components/AdminUI/AdminEditor.module.scss` | פריסת עורכים, רשומות, ניווט מסמכים ומשוב; טוקנים קיימים בלבד |
| `AdminLink` בתוך `AdminPrimitives.tsx` | קישור native באותו בסיס של כפתור משני |

## כספי המעון - הסבה בפועל (18.10.2026)

- לפני ההסבה: DaycareFinanceView השתמש בפקדי native ובמחלקות finance של DaycareAdmin.module.scss, ללא AdminUI. DaycareFinance מחבר את hook הנתונים לתצוגה בלבד.
- אחרי: AdminButton לשמירה מפורשת, AdminSelect לחודש, AdminInput לכל שדות הסכום ומספר הילדים, AdminBadge לסוג החודש ו־AdminCard לטופס ולסיכומים. אין במסך הפעיל טבלה, דיאלוג או תהליך סליקה ולכן אין שימוש מלאכותי ב־AdminTable/AdminDialog.
- התהליכים שנסקרו: טעינה ונרמול חודשים, בחירת חודש, הכנסות וחישוב בעקבות ילדים/מחיר, הוצאות קבועות ומשתנות, הקמה בינואר–ספטמבר, החזר שיפוץ, שמירה/כשל/ניסיון חוזר, סיכום השקעה ועלויות מתתי־משימות. hook, utils, service, endpoints ו־payloads לא שונו.
- DaycareFinance.module.scss מכיל רק פריסה ייחודית, צפיפות שורות כספיות, fieldset, טיפוגרפיית סכומים וארגון מובייל. מחלקות finance הישנות הוסרו מקובץ ההורה, תוך שמירת סלקטורים משותפים. אין CSS מקומי לבסיס כפתורים, שדות, כרטיסים או תגים.
- פורמט הסכומים הקיים נשמר עם ₪ והפרדת אלפים; bdi מבודד סכומים ומינוס מה־RTL. ערכי קלט נשארים טיוטות כפי שהוזנו כדי לשמר את חוזה העריכה והוולידציה הקיים. שדות כספיים מסומנים ב־₪; מספר הילדים אינו סכום.

## תרומות ולידים - מיפוי ההסבה (18.10.2026)

| אזור פעיל | רכיב | תהליכים ומגבלות |
|---|---|---|
| סקירה | DonationOverviewAdminView | מצב קמפיין, סיכומי קטגוריות, תרומות אחרונות וקיצורי דרך |
| תרומות | DonationRecordsAdminView | חיפוש שם/טלפון/מייל/עסקה/שגריר; סינון מצב; שיוך שגריר, פרטיות, יעד/פיצול, מצב וסיבת שינוי. אין מיון אינטראקטיבי |
| שגרירים | DaycareAmbassadorsAdmin | יצירה/עריכה/השבתה/מחיקה, קישור אישי, התקדמות ופרטי תרומות |
| עדכונים | DaycareFieldUpdatesAdmin | יצירה/עריכה ותמונה, פרסום/הסתרה ומחיקה |
| הזנה ידנית | DonationManualAdminView | מטבע ושער, סכום/תאריך, מקור, תורם, פרטיות, יעד ושגריר |
| סעיפים ויעדים | DonationItemsAdminView | מסלולים מומלצים, יעדי פריטים, מצב וסיבת שינוי |
| היסטוריה | DaycareDonationsAdminView | audit ואבחון; ההיסטוריה נפתחת במובייל דרך ״אפשרויות נוספות״ |
| לידים - לא מחובר | DaycareDonationLeadsAdmin | חיפוש שימושים לפני ההסבה אישר שאין import/route/הורה פעיל. הוסב ונבדק ברתמת דמה בלבד; לא נוסף חיבור למערכת |

- החיבור הפעיל היחיד הוא DaycareAdmin → DaycareDonationsAdmin → DaycareDonationsAdminView. השגרירים ועדכוני השטח מיובאים רק בתצוגה זו; ארבע תצוגות Donation*AdminView משתמשות באותו SCSS מקומי. DonationAllocationDialog מיובא רק מכאן.
- AdminShell מפעיל Modern Dark גם עבור itemId=donations. יתר הנתיבים לא הורחבו. בדיקת תחולת הרישום עודכנה לצפות להסבה המאושרת.
- AdminButton/Input/Select/Textarea/Badge/Card/Table/Dialog/Link/DesignScope ו־AdminConfirmDialog קיימים נוצלו. נוסף AdminReasonDialog כהרכבת חלון ושדות קיימים, ללא CSS בסיס נוסף או שינוי ב־ReasonDialog הציבורי.
- המשטחים, השדות, הכפתורים והתגים הישנים הוסרו מקובצי התרומות. נשארו פריסות, שורות מובייל, התקדמות שגריר, חיווי פרטיות, מבנה פיצול, הודעות והעלאת תמונה native. תוויות משתמשות ב־controls.field-label.
- DonationModalPreview הוא רכיב ציבורי משותף: גם מסך התודה וגם עסקת האבחון ממשיכים להשתמש במימוש המקורי. הוא לא הוסב, כדי לשמר את תהליך הסליקה. לא הופעלה עסקת תשלום אמיתית.
- רכיבי ConfirmDialog/ReasonDialog/BaseDialog המקוריים וצרכניהם האחרים לא שונו. hooks, שירותים, API, הרשאות ומבני נתונים לא שונו.
- בדיקות: check-admin-donations.cjs לשבע הלשוניות הפעילות; check-admin-donation-leads.cjs לרכיב המנותק. ארבעה רוחבים: 1440, 768, 390, 320px. כל API מדומה בזיכרון וכל תעבורה חיצונית חסומה.
