import { supabase } from './supabaseClient.js'

const BUCKET = 'lms-materials'

export const MATERIAL_FILE_ACCEPT = {
  PDF: { mime: ['application/pdf'], label: 'PDF' },
  PPT: {
    mime: [
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    ],
    label: 'PPT / PPTX',
  },
  Video: { mime: ['video/mp4', 'video/webm', 'video/ogg'], label: 'MP4 / WebM / OGG' },
}

export const MATERIAL_FILE_MAX_BYTES = 50 * 1024 * 1024

export function acceptAttributeFor(type) {
  return MATERIAL_FILE_ACCEPT[type]?.mime.join(',') ?? ''
}

export function validateMaterialFile(file, type) {
  const rule = MATERIAL_FILE_ACCEPT[type]
  if (!rule) return 'Tipe materi ini tidak mendukung unggah file.'
  if (!rule.mime.includes(file.type)) return `Format file harus ${rule.label}.`
  if (file.size > MATERIAL_FILE_MAX_BYTES) return 'Ukuran file maksimal 50 MB.'
  return null
}

function safeFileName(name) {
  return name.toLowerCase().replace(/[^a-z0-9.\-_]+/g, '-')
}

/**
 * Uploads a material file to the public LMS bucket and returns its public URL.
 * @param {File} file
 * @returns {Promise<string>}
 */
export async function uploadMaterialFile(file) {
  const path = `${Date.now()}-${safeFileName(file.name)}`
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: false,
  })
  if (error) throw new Error(error.message)
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return data.publicUrl
}
