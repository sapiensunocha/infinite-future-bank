export const formatCurrency = (amount, currency = 'USD', locale = 'en-US') =>
  new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount);

export const formatDate = (date, locale = 'en-US') =>
  new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(date));

export const formatCount = (num) => {
  if (num >= 1e9) return (num / 1e9).toFixed(1).replace(/\.0$/, '') + 'B';
  if (num >= 1e6) return (num / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
  if (num >= 1e3) return (num / 1e3).toFixed(1).replace(/\.0$/, '') + 'K';
  return String(num);
};

export const IFB_APPS = {
  core:      'https://app.infinitefuturebank.org',
  ventures:  'https://ventures.infinitefuturebank.org',
  npo:       'https://npo.infinitefuturebank.org',
  events:    'https://tickets.infinitefuturebank.org',
  business:  'https://business.infinitefuturebank.org',
  wealth:    'https://wealth.infinitefuturebank.org',
  admin:     'https://admin.infinitefuturebank.org',
};
