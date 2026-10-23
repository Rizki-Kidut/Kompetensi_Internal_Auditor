import { ref, computed } from 'vue'

/**
 * DRAFT role composable for the LMS module.
 * TODO: ganti dengan Supabase Auth setelah login diimplementasikan.
 *
 * Roles:
 * - 'Admin'   → full access to Admin LMS group
 * - 'Assessor' → full access to Admin LMS group
 * - 'Auditor'  → only sees the "Belajar (LMS)" group + must pick which auditor they are
 */

const _role = ref('Admin')
const _auditorId = ref('')

const ROLES = ['Admin', 'Assessor', 'Auditor']

export function useLmsRole() {
  const role = computed({
    get: () => _role.value,
    set: (v) => { _role.value = v },
  })

  const auditorId = computed({
    get: () => _auditorId.value,
    set: (v) => { _auditorId.value = v },
  })

  const isAdminOrAssessor = computed(() => _role.value === 'Admin' || _role.value === 'Assessor')
  const isAuditor = computed(() => _role.value === 'Auditor')
  const roles = ROLES

  return { role, auditorId, isAdminOrAssessor, isAuditor, roles }
}
