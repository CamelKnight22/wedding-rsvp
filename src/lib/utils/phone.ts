// Format Australian phone numbers to E.164 format
export function formatAUPhone(phone: string): string {
  // Remove all non-digit characters
  let cleaned = phone.replace(/\D/g, "");

  // Handle Australian mobile numbers
  if (cleaned.startsWith("0")) {
    cleaned = "61" + cleaned.substring(1);
  }

  if (!cleaned.startsWith("61")) {
    cleaned = "61" + cleaned;
  }

  return "+" + cleaned;
}

// Format for display (0412 345 678)
export function formatPhoneDisplay(phone: string): string {
  const cleaned = phone.replace(/\D/g, "");

  // If it starts with 61, convert to local format
  let local = cleaned;
  if (cleaned.startsWith("61")) {
    local = "0" + cleaned.substring(2);
  } else if (!cleaned.startsWith("0")) {
    local = "0" + cleaned;
  }

  // Format as 0412 345 678
  if (local.length === 10) {
    return `${local.slice(0, 4)} ${local.slice(4, 7)} ${local.slice(7)}`;
  }

  return local;
}

// Validate Australian mobile number
export function isValidAUMobile(phone: string): boolean {
  const cleaned = phone.replace(/\D/g, "");

  // Check for valid Australian mobile formats
  // 04xx xxx xxx (10 digits starting with 04)
  // 614xx xxx xxx (11 digits starting with 614)
  // +614xx xxx xxx (11 digits starting with 614)

  if (cleaned.length === 10 && cleaned.startsWith("04")) {
    return true;
  }

  if (cleaned.length === 11 && cleaned.startsWith("614")) {
    return true;
  }

  return false;
}
