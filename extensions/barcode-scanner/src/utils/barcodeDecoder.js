
const PREFIX = "9"; // 1 digit
const CHECKSUM_DIGITS = 1;

// Simple checksum (Luhn)
const checksum = (num) => {
  let sum = 0,
    alt = false;
  for (let i = num.length - 1; i >= 0; i--) {
    let d = +num[i];
    if (alt) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    alt = !alt;
  }
  return ((10 - (sum % 10)) % 10).toString();
};



export const decodeBarcode = (barcode) => {
  try {
    const clean = barcode.replace(/\D/g, "");

    if (!clean.startsWith(PREFIX) || clean.length !== 18) return null;
    const data = clean.slice(1, 17); // 16 digits (excludes PREFIX and CHECKSUM)

    const last5   = data.slice(0, 5);   // positions 0–4
    // r1        = data.slice(5, 6)     // ignored
    const middle4 = data.slice(6, 10);  // positions 6–9
    // r2        = data.slice(10, 11)   // ignored
    const first5  = data.slice(11, 16); // positions 11–15

    // Reconstruct original cleanId order: first5 + middle4 + last5
    const reconstructed = first5 + middle4 + last5;

    // Strip leading zeros and return
    return parseInt(reconstructed, 10).toString();
  } catch (error) {
    console.error("Decode failed:", error);
    return null;
  }
};

