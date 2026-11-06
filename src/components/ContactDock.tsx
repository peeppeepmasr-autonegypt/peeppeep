/**
 * The mobile action dock: two ways to reach the showroom from a phone.
 *
 * It replaces a floating WhatsApp pill that hard-coded one business's Arabic
 * name into its message — so every other minisite on the portal was sending
 * customers to the wrong showroom in the opener. Everything here comes from the
 * authored record: the brand, the listing title, the phone number, the language
 * of the page being read.
 *
 * It is a server component on purpose: two anchors and no state. On screens
 * wide enough to show the contact plate in the header, the plate already carries
 * the same two actions, so the dock hides itself.
 */
import type { SiteLocale } from '@/lib/site-locale';

export interface ContactDockProps {
  /** The authored showroom phone, as printed for the visitor to read. */
  phone: string;
  brand: string;
  /** The listing being viewed, when the page is a car rather than a showroom. */
  carTitle?: string | null;
  price?: number | null;
  locale: SiteLocale;
}

export default function ContactDock({ phone, brand, carTitle, price, locale }: ContactDockProps) {
  const tel = phone.replace(/[^\d+]/g, '');
  const digits = phone.replace(/\D/g, '');
  if (!digits) return null;

  const message =
    locale === 'ar'
      ? `مرحباً ${brand}، أود الاستفسار عن ${carTitle ? `«${carTitle}»` : 'السيارات المتاحة لديكم'}${price ? ` المعروضة بـ ${price.toLocaleString('en-US')} جنيه` : ''} وخيارات التقسيط.`
      : `Hello ${brand}, I would like to ask about ${carTitle ? `"${carTitle}"` : 'your available cars'}${price ? ` listed at ${price.toLocaleString('en-US')} EGP` : ''} and the installment options.`;

  const wa = `https://wa.me/${digits.replace(/^0/, '20')}?text=${encodeURIComponent(message)}`;

  return (
    <div className="dock sm:hidden" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
      <a className="act act--call" href={`tel:${tel}`}>
        {locale === 'ar' ? 'اتصال بالمعرض' : 'Call showroom'}
      </a>
      <a className="act act--wa" href={wa} target="_blank" rel="noopener noreferrer">
        WhatsApp
      </a>
    </div>
  );
}
