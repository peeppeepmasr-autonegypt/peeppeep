export const BUSINESS_APPLICATIONS = [
  {
    id: 'crm',
    name: 'AL Mostashar Auto CRM',
    nameAr: 'إدارة العملاء والمبيعات',
    description: 'Leads, sales pipeline, and customer follow-up.',
    descriptionAr: 'العملاء المحتملون ومسار المبيعات والمتابعة.',
  },
  {
    id: 'marketplace',
    name: 'AL Mostashar Auto Marketplace',
    nameAr: 'سوق المركبات وواتساب',
    description: 'Vehicle marketplace and WhatsApp-ready listings.',
    descriptionAr: 'سوق المركبات وإعلانات جاهزة للمشاركة عبر واتساب.',
  },
  {
    id: 'accounting',
    name: 'AL Mostashar Auto Accounting',
    nameAr: 'المحاسبة والمخزون',
    description: 'Inventory, contracts, collections, and accounting.',
    descriptionAr: 'المخزون والعقود والتحصيل والقيود المحاسبية.',
  },
] as const;

export type BusinessApplicationId = typeof BUSINESS_APPLICATIONS[number]['id'];
