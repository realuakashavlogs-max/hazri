export function normalizePhoneNumber(phone: string | null | undefined): string {
  if (!phone) return '';
  // Keep only digits
  const digits = phone.replace(/[^0-9]/g, '');
  return digits;
}

export function buildWhatsAppLink(params: {
  phone: string | null | undefined;
  template: string;
  studentName: string;
  className: string;
  status: string;
  date: string;
  appName: string;
}): string {
  const cleanPhone = normalizePhoneNumber(params.phone);
  
  const message = params.template
    .replace(/{student_name}/g, params.studentName)
    .replace(/{class_name}/g, params.className)
    .replace(/{status}/g, params.status)
    .replace(/{date}/g, params.date)
    .replace(/{app_name}/g, params.appName);

  const encoded = encodeURIComponent(message);
  
  if (cleanPhone) {
    return `https://wa.me/${cleanPhone}?text=${encoded}`;
  }
  return `https://wa.me/?text=${encoded}`;
}

export function buildDirectWhatsAppUrl(
  phone: string | null | undefined,
  message: string
): string {
  let cleanPhone = normalizePhoneNumber(phone);
  if (/^03\d{9}$/.test(cleanPhone)) {
    cleanPhone = `92${cleanPhone.slice(1)}`;
  }
  const encoded = encodeURIComponent(message);
  if (cleanPhone) {
    return `https://wa.me/${cleanPhone}?text=${encoded}`;
  }
  return `https://wa.me/?text=${encoded}`;
}

