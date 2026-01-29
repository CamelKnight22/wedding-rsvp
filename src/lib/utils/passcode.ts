// Generate a simple, memorable passcode
export function generatePasscode(firstName: string): string {
  const cleanName = firstName.toLowerCase().replace(/[^a-z]/g, "");
  const shortName = cleanName.slice(0, 4) || "guest";
  const randomNum = Math.floor(100 + Math.random() * 900); // 3-digit number
  return `${shortName}${randomNum}`;
}

// Examples: "sara472", "mike831", "john156"
