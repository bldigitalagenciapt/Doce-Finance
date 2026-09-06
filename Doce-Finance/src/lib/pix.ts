/**
 * Geração de payload Pix "Copia e Cola" no padrão EMV / BR Code
 * definido pelo Banco Central do Brasil.
 *
 * Referência: Manual de Padrões para Iniciação do Pix (BCB).
 */

/** Remove acentos e caracteres inválidos, e limita o tamanho. */
function sanitize(text: string, maxLen: number): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos
    .replace(/[^A-Za-z0-9 ]/g, '') // apenas alfanumérico e espaço
    .trim()
    .slice(0, maxLen)
}

/** Monta um campo EMV: id + tamanho (2 dígitos) + valor. */
function field(id: string, value: string): string {
  const len = value.length.toString().padStart(2, '0')
  return `${id}${len}${value}`
}

/** Calcula o CRC16-CCITT (polinômio 0x1021), exigido pelo BR Code. */
function crc16(payload: string): string {
  let crc = 0xffff
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1
      crc &= 0xffff
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0')
}

interface PixParams {
  pixKey: string
  merchantName: string
  merchantCity?: string
  amount?: number
  txid?: string
}

/**
 * Gera o payload Pix (BR Code "copia e cola").
 * Retorna a string pronta para gerar QR Code ou copiar.
 */
export function buildPixPayload({
  pixKey,
  merchantName,
  merchantCity = 'SAO PAULO',
  amount,
  txid = '***',
}: PixParams): string {
  const gui = field('00', 'br.gov.bcb.pix')
  const key = field('01', pixKey.trim())
  const merchantAccountInfo = field('26', gui + key)

  const name = sanitize(merchantName || 'ATELIER', 25) || 'ATELIER'
  const city = sanitize(merchantCity, 15) || 'SAO PAULO'

  let payload =
    field('00', '01') + // Payload Format Indicator
    merchantAccountInfo +
    field('52', '0000') + // Merchant Category Code
    field('53', '986') + // Moeda BRL
    (amount && amount > 0 ? field('54', amount.toFixed(2)) : '') +
    field('58', 'BR') + // País
    field('59', name) +
    field('60', city) +
    field('62', field('05', sanitize(txid, 25) || '***')) // Additional data (txid)

  payload += '6304' // ID + tamanho do CRC, entra no cálculo
  const crc = crc16(payload)
  return payload + crc
}

const KEY_TYPE_LABEL: Record<string, string> = {
  cpf: 'CPF',
  cnpj: 'CNPJ',
  email: 'E-mail',
  telefone: 'Telefone',
  aleatoria: 'Chave aleatória',
}

export function pixKeyTypeLabel(type: string | null | undefined): string {
  if (!type) return 'Chave Pix'
  return KEY_TYPE_LABEL[type] || 'Chave Pix'
}
