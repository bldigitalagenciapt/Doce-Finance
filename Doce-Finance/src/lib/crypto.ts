import crypto from 'crypto'

/**
 * Módulo de Criptografia de Dados do Usuário (AES-256-GCM).
 * USO EXCLUSIVO NO SERVIDOR.
 *
 * Formato do texto cifrado:
 *   enc:v1:<iv_base64url>:<authTag_base64url>:<ciphertext_base64url>
 *
 * - Criptografia autenticada (AEAD) com IV aleatório de 12 bytes (96 bits) a cada gravação
 *   e tag de integridade de 16 bytes (128 bits).
 * - Compatível com dados legados: se o valor armazenado não possuir o prefixo "enc:v1:",
 *   decryptField() devolve o valor original sem erro.
 */

const PREFIX = 'enc:v1:'
const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12
const TAG_LENGTH = 16

let cachedKey: Buffer | null = null

function getEncryptionKey(): Buffer {
  if (typeof window !== 'undefined') {
    throw new Error('O módulo de criptografia é exclusivo para execução no servidor.')
  }
  if (cachedKey) return cachedKey

  const rawSecret =
    process.env.DATA_ENCRYPTION_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.STRIPE_SECRET_KEY

  if (!rawSecret) {
    throw new Error(
      'Defina DATA_ENCRYPTION_KEY (ou SUPABASE_SERVICE_ROLE_KEY) nas variáveis de ambiente para criptografia de dados.',
    )
  }

  // Deriva uma chave de 256 bits (32 bytes) usando scrypt com salt determinístico de domínio
  cachedKey = crypto.scryptSync(rawSecret, 'doce-finance-aes-256-gcm-v1', 32)
  return cachedKey
}

/**
 * Criptografa uma string sensível usando AES-256-GCM.
 * Se o valor for nulo/vazio ou já estiver criptografado, retorna como está.
 */
export function encryptField(plainText: string | null | undefined): string | null {
  if (plainText === null || plainText === undefined) return null
  const trimmed = String(plainText).trim()
  if (!trimmed) return null
  if (trimmed.startsWith(PREFIX)) return trimmed

  const key = getEncryptionKey()
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, { authTagLength: TAG_LENGTH })

  const encrypted = Buffer.concat([cipher.update(trimmed, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()

  return `${PREFIX}${iv.toString('base64url')}:${authTag.toString('base64url')}:${encrypted.toString('base64url')}`
}

/**
 * Descriptografa um campo cifrado com AES-256-GCM.
 * Se o valor estiver em texto puro (dado legado pré-criptografia), retorna o próprio texto.
 */
export function decryptField(cipherText: string | null | undefined): string | null {
  if (cipherText === null || cipherText === undefined) return null
  const value = String(cipherText)
  if (!value.startsWith(PREFIX)) return value

  try {
    const payload = value.slice(PREFIX.length)
    const parts = payload.split(':')
    if (parts.length !== 3) return value

    const [ivB64, tagB64, dataB64] = parts
    const key = getEncryptionKey()
    const iv = Buffer.from(ivB64, 'base64url')
    const authTag = Buffer.from(tagB64, 'base64url')
    const encryptedData = Buffer.from(dataB64, 'base64url')

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, { authTagLength: TAG_LENGTH })
    decipher.setAuthTag(authTag)

    const decrypted = Buffer.concat([decipher.update(encryptedData), decipher.final()])
    return decrypted.toString('utf8')
  } catch (err) {
    console.error('[crypto] Falha ao descriptografar campo:', err)
    return null
  }
}

/**
 * Descriptografa todos os campos sensíveis de um objeto Profile.
 */
export function decryptProfileFields<T extends Record<string, any> | null | undefined>(profile: T): T {
  if (!profile) return profile
  return {
    ...profile,
    full_name: decryptField(profile.full_name) ?? profile.full_name,
    phone: decryptField(profile.phone),
    email_contact: decryptField(profile.email_contact),
    address: decryptField(profile.address),
    pix_key: decryptField(profile.pix_key),
    mbway_phone: decryptField(profile.mbway_phone),
  }
}

