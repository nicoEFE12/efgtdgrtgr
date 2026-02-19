/**
 * Convierte números a texto en español
 * Ejemplo: 253.40 -> "Doscientos cincuenta y tres pesos con cuarenta centavos"
 */

const ONES = [
  "",
  "uno",
  "dos",
  "tres",
  "cuatro",
  "cinco",
  "seis",
  "siete",
  "ocho",
  "nueve",
];

const TENS = [
  "",
  "diez",
  "veinte",
  "treinta",
  "cuarenta",
  "cincuenta",
  "sesenta",
  "setenta",
  "ochenta",
  "noventa",
];

const TEENS = [
  "diez",
  "once",
  "doce",
  "trece",
  "catorce",
  "quince",
  "dieciséis",
  "diecisiete",
  "dieciocho",
  "diecinueve",
];

const SCALES = [
  { name: "mil", value: 1000 },
  { name: "millón", value: 1000000 },
  { name: "mil millones", value: 1000000000 },
  { name: "billón", value: 1000000000000 },
];

function convertGroup(num: number): string {
  if (num === 0) return "";

  let text = "";
  const hundreds = Math.floor(num / 100);
  const remainder = num % 100;

  if (hundreds > 0) {
    if (hundreds === 1) {
      text += "ciento";
    } else if (hundreds === 5) {
      text += "quinientos";
    } else if (hundreds === 7) {
      text += "setecientos";
    } else if (hundreds === 9) {
      text += "novecientos";
    } else {
      text += ONES[hundreds] + "cientos";
    }
  }

  if (remainder > 0) {
    if (text) text += " ";

    if (remainder < 10) {
      text += ONES[remainder];
    } else if (remainder < 20) {
      text += TEENS[remainder - 10];
    } else {
      const tens = Math.floor(remainder / 10);
      const ones = remainder % 10;

      text += TENS[tens];
      if (ones > 0) {
        text += " y " + ONES[ones];
      }
    }
  }

  return text;
}

export function numberToText(
  amount: number,
  currency: "ARS" | "USD" = "ARS"
): string {
  if (amount === 0) {
    return `Cero ${currency === "ARS" ? "pesos" : "dólares"}`;
  }

  const isNegative = amount < 0;
  const absoluteAmount = Math.abs(amount);

  const pesos = Math.floor(absoluteAmount);
  const centavos = Math.round((absoluteAmount - pesos) * 100);

  let text = "";

  // Convert pesos/dollars
  if (pesos === 0) {
    text = "Cero";
  } else if (pesos === 1) {
    text = "Un";
  } else {
    let remaining = pesos;
    let scaleIndex = SCALES.length - 1;

    while (remaining > 0 && scaleIndex >= 0) {
      const scale = SCALES[scaleIndex];
      const count = Math.floor(remaining / scale.value);

      if (count > 0) {
        if (text) text += " ";

        if (count === 1 && scale.value >= 1000) {
          text += scale.name;
        } else {
          text += convertGroup(count) + " " + scale.name;
        }

        remaining = remaining % scale.value;
      }

      scaleIndex--;
    }

    if (remaining > 0) {
      if (text) text += " ";
      text += convertGroup(remaining);
    }
  }

  // Add currency and centavos
  const currencyName = currency === "ARS" ? "pesos" : "dólares";
  text += ` ${currencyName}`;

  if (centavos > 0) {
    text += ` con ${convertGroup(centavos)} centavos`;
  }

  // Capitalize first letter
  text = text.charAt(0).toUpperCase() + text.slice(1);

  return isNegative ? "Menos " + text : text;
}
