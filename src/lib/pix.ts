// Gera o payload "copia e cola" do PIX (padrão BR Code / EMV) para cobrança estática.
// Chave PIX: CNPJ 48.668.225/0001-47

const PIX_KEY = "48668225000147"; // CNPJ, somente dígitos
const MERCHANT_NAME = "PORTAL DO CONCURSEIRO";
const MERCHANT_CITY = "MACAPA";

function emv(id: string, value: string): string {
  return id + String(value.length).padStart(2, "0") + value;
}

function crc16(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

export function buildPixPayload(valor: number, txid: string): string {
  const merchantAccount = emv("00", "br.gov.bcb.pix") + emv("01", PIX_KEY);
  const txidClean = txid.replace(/[^A-Za-z0-9]/g, "").slice(0, 25) || "PREMIUM";
  const payload =
    emv("00", "01") +
    emv("26", merchantAccount) +
    emv("52", "0000") +
    emv("53", "986") +
    emv("54", valor.toFixed(2)) +
    emv("58", "BR") +
    emv("59", MERCHANT_NAME.slice(0, 25)) +
    emv("60", MERCHANT_CITY.slice(0, 15)) +
    emv("62", emv("05", txidClean)) +
    "6304";
  return payload + crc16(payload);
}

export const PIX_VALOR_PREMIUM = 9.99;
