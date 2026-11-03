import { BookOpen, BriefcaseBusiness, Coins, FileText, HandHeart, Leaf, Mail, NotebookPen, ListChecks, UserRoundPlus } from 'lucide-react';

export const adminGroups = [
    {
        id: 'website', label: 'פעילות באתר', items: [
            { id: 'shifra', label: 'שפרה ופועה', title: 'שפרה ופועה', to: '/admin/shifra-pua', icon: HandHeart },
            { id: 'maftir', label: 'מפטיר יונה', title: 'מפטיר יונה', to: '/admin/maftir-yona', icon: BookOpen },
            { id: 'arbaat', label: 'ארבעת המינים', title: 'ארבעת המינים', to: '/admin/arbaat-haminim', icon: Leaf },
            { id: 'letters', label: 'מכתבים לרבי', title: 'מכתבים לרבי', to: '/admin/dashboard?tab=rebbeLetters', icon: Mail },
        ]
    },
    {
        id: 'daycare', label: 'המעון', items: [
            { id: 'registration', label: 'רישום', title: 'רישום למעון', to: '/admin/daycare', icon: UserRoundPlus },
            { id: 'tasks', label: 'משימות', title: 'משימות המעון', to: '/admin/daycare?tab=tasks', icon: ListChecks },
            { id: 'finance', label: 'כספי המעון', title: 'כספי המעון', to: '/admin/daycare?tab=finance', icon: Coins },
            { id: 'donations', label: 'תרומות למעון', title: 'תרומות למעון', to: '/admin/daycare?tab=donations', icon: HandHeart },
            { id: 'documents', label: 'מסמכים', title: 'מסמכי המעון', to: '/admin/daycare?tab=documents', icon: FileText },
        ]
    },
    {
        id: 'internal', label: 'ניהול בית חב״ד', items: [
            { id: 'projects', label: 'פרויקטים', title: 'פרויקטים', to: '/admin/dashboard', icon: BriefcaseBusiness },
            { id: 'payments', label: 'כספי בית חב״ד', title: 'כספי בית חב״ד', to: '/admin/dashboard?tab=payments', icon: NotebookPen },
        ]
    },
];

export function resolveAdminLocation(pathname: string, search: string) {
    const params = new URLSearchParams(search);
    const tab = params.get('tab');
    let groupId = 'internal';
    let itemId = 'projects';
    let legacyTitle: string | undefined;
    if (pathname === '/admin/shifra-pua') {
        groupId = 'website'; itemId = 'shifra';
    } else if (pathname === '/admin/maftir-yona' || pathname === '/admin/arbaat-haminim') {
        groupId = 'website'; itemId = pathname.endsWith('maftir-yona') ? 'maftir' : 'arbaat';
    } else if (pathname.startsWith('/admin/daycare-onboarding/')) {
        groupId = 'daycare'; itemId = 'registration'; legacyTitle = 'תיק הצטרפות למעון';
    } else if (pathname === '/admin/daycare') {
        groupId = 'daycare';
        itemId = tab === 'agreements' ? 'documents' : ['tasks', 'finance', 'donations', 'documents'].includes(tab ?? '') ? tab! : 'registration';
    } else if (tab === 'rebbeLetters') {
        groupId = 'website'; itemId = 'letters';
    } else if (tab === 'daycareRegistrations') {
        groupId = 'daycare'; itemId = 'registration'; legacyTitle = 'פניות למעון - מסך קודם';
    } else if (tab === 'families') {
        itemId = ''; legacyTitle = 'משפחות';
    } else if (tab === 'payments') { itemId = 'payments'; }
    const group = adminGroups.find(group => group.id === groupId)!;
    const item = group.items.find(item => item.id === itemId);
    return { groupId, itemId, title: legacyTitle ?? item?.title ?? 'ניהול', section: params.get('section') };
}
