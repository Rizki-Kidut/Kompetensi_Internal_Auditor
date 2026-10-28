#!/usr/bin/env bash
# context-pack.sh — kumpulkan konteks minimal untuk satu item backlog, siap ditempel ke chat AI.
# Jalankan dari ROOT repo:
#   bash scripts/context-pack.sh P0-1            > pack.txt   # aturan ringkas (docs/CHAT_RULES.md)
#   bash scripts/context-pack.sh P0-1 --full     > pack.txt   # pakai AGENTS.md lengkap
#   bash scripts/context-pack.sh P2-1 src/modules/lms/views/AdminKursusMateri.vue > pack.txt
# Ukuran perkiraan (karakter dan token kasar) dicetak ke stderr.
set -euo pipefail

ID="${1:-}"
OPT="${2:-}"
[ -z "$ID" ] && { echo "Pemakaian: bash scripts/context-pack.sh <ID backlog> [--full|<path untuk P2-1>]" >&2; exit 1; }
[ -d supabase/migrations ] || { echo "Jalankan dari root repo." >&2; exit 1; }

hdr()  { printf '\n===== %s =====\n' "$1"; }
file() { if [ -f "$1" ]; then printf '\n----- %s (%s baris) -----\n' "$1" "$(wc -l < "$1")"; cat "$1"; else printf '\n----- %s: TIDAK DITEMUKAN -----\n' "$1"; fi; }
note() { printf '\n[catatan] %s\n' "$1"; }

sqlfn() { # $1 = nama fungsi
  local f
  for f in supabase/migrations/*.sql; do
    awk -v name="$1" '
      p==0 && tolower($0) ~ ("create (or replace )?function +(public\\.)?" name "\\(") { p=1; printf("\n-- dari %s\n", FILENAME) }
      p==1 { print; n += gsub(/\$[A-Za-z_]*\$/, "&"); if (n >= 2 && $0 ~ /;[[:space:]]*$/) exit }
    ' "$f"
  done
}
sqltable() { # $1 = nama tabel
  local f
  for f in supabase/migrations/*.sql; do
    awk -v name="$1" '
      p==0 && tolower($0) ~ ("create table( if not exists)? +(public\\.)?" name " *\\(") { p=1; printf("\n-- dari %s\n", FILENAME) }
      p==1 { print } p==1 && /^\);/ { exit }
    ' "$f"
  done
}
grepc() { # $1 = pola, sisanya = path; tampilkan dengan 2 baris konteks
  local pat="$1"; shift
  grep -rn -C2 -E "$pat" "$@" 2>/dev/null || echo "(tidak ada hasil untuk: $pat)"
}
section() { # $1 = kata kunci judul "## Sesi ..." di docs/AGENT_PROMPTS.md
  awk -v kw="$1" 'p==0 && /^## Sesi/ && index($0, kw) { p=1; print; next } p==1 && /^## / { exit } p==1 { print }' docs/AGENT_PROMPTS.md
}
backlog() { # $1 = ID
  awk -v id="### $1 " 'index($0, id)==1 { p=1; print; next } p==1 && /^(### |---|## )/ { exit } p==1 { print }' docs/POLISH_BACKLOG.md
}

build() {
  hdr "ATURAN"
  if [ "$OPT" = "--full" ]; then cat AGENTS.md; else cat docs/CHAT_RULES.md; fi
  hdr "ITEM BACKLOG $ID"
  backlog "$ID"
  hdr "PROMPT SESI"
  case "$ID" in
    P0-1) section "P0-1" ;; P0-2) section "P0-2" ;; P0-3) section "P0-3" ;; P0-4) section "P0-4" ;; P0-5) section "P0-5" ;;
    P1-1) section "P1-1" ;; P1-2) section "P1-2" ;; P1-3) section "P1-3" ;; P1-4) section "P1-4" ;; P1-5) section "P1-5" ;;
    P1-6) section "P1-6" ;; P1-7) section "P1-7" ;; P2-1) section "P2-1" ;; P2-2) section "P2-2" ;; P2-3) section "P2-3" ;;
    P2-4|P2-5) section "P2-4" ;;
    *) echo "(ID tidak dikenal)";;
  esac
  hdr "KONTEKS KODE"
  case "$ID" in
    P0-1)
      hdr "SQL: tabel"; for t in lms_attempts lms_tests lms_questions lms_test_questions; do sqltable "$t"; done
      hdr "SQL: fungsi"; sqlfn lms_submit_attempt; sqlfn lms_create_draft_evaluation
      file src/stores/lmsEnrollmentStore.js; file src/stores/lmsTestStore.js
      file src/modules/lms/views/AdminPenilaian.vue ;;
    P0-2)
      hdr "SQL: tabel"; for t in lms_submissions lms_workshop_tasks lms_attempts; do sqltable "$t"; done
      hdr "SQL: fungsi"; sqlfn lms_create_draft_evaluation
      file src/stores/lmsWorkshopStore.js; file src/modules/lms/views/AdminPenilaian.vue
      hdr "Semua akses klien ke lms_attempts dan lms_submissions"
      grepc "from\('lms_(attempts|submissions)'\)" src ;;
    P0-3)
      file src/router/index.js; file src/shared/composables/useLmsRole.js
      hdr "SidebarLayout: bagian LMS/peran"; grepc "lms|Lms|role|Role" src/shared/components/SidebarLayout.vue
      hdr "Daftar view LMS"; ls src/modules/lms/views ;;
    P0-4)
      hdr "Daftar migrasi"; ls -1 supabase/migrations
      hdr "Seed di migrasi fondasi"; grep -n -i "seed\|INSERT INTO" supabase/migrations/*lms_module_foundation*.sql | cut -c1-200 ;;
    P0-5)
      hdr "Akses storage di kode"; grepc "storage|getPublicUrl|\.upload\(|createSignedUrl" src
      file src/modules/lms/views/WorkshopSaya.vue
      hdr "AdminKursusMateri: form materi"; grepc "url|file|material|Material" src/modules/lms/views/AdminKursusMateri.vue | head -150
      note "Untuk perubahan di AdminKursusMateri.vue, tempel file lengkapnya di chat hanya bila diminta model." ;;
    P1-1)
      file docs/SECURITY.md; file src/shared/composables/useLmsRole.js; file src/router/index.js
      hdr "Daftar fungsi RPC"; grep -n -i "create or replace function" supabase/migrations/*.sql | sed 's/.*migrations\///' | cut -c1-160
      hdr "Policy RLS (nama)"; grep -n -i "create policy" supabase/migrations/*.sql | sed 's/.*migrations\///' | cut -c1-140 | head -80 ;;
    P1-2)
      file src/modules/training-session/views/PelaksanaanTraining.vue; file src/stores/trainingSessionStore.js
      hdr "Enrollment: progres/status"; grepc "status|progress|Belajar|Terdaftar" src/stores/lmsEnrollmentStore.js src/modules/lms/views/KursusDetail.vue ;;
    P1-3) file src/services/calculationService.js ;;
    P1-4)
      file src/modules/qualification-card/views/KartuRiwayatAuditor.vue; file src/modules/dashboard/views/DashboardKompetensi.vue
      hdr "Ekspor kartu riwayat"; grep -rln "exportQualificationCard" src | head -3 ;;
    P1-5)
      hdr "SQL: fungsi"; sqlfn lms_start_attempt; sqlfn lms_get_test_questions; sqlfn lms_submit_attempt
      file src/modules/lms/views/TesTertulis.vue; file src/stores/lmsTestStore.js ;;
    P1-6)
      hdr "console.* di LMS dan store"; grep -rn "console\." src/modules/lms src/stores | cut -c1-170
      for f in src/stores/lms*.js; do file "$f"; done ;;
    P1-7)
      hdr "confirm()/alert() di LMS"; grepc "confirm\(|alert\(" src/modules/lms
      file src/shared/components/BaseModal.vue
      hdr "Tempat memasang dialog"; grepc "BaseModal|ToastContainer" src/shared/components/SidebarLayout.vue src/App.vue ;;
    P2-1)
      if [ -n "$OPT" ] && [ -f "$OPT" ]; then file "$OPT"; else
        hdr "Kandidat (jalankan ulang dengan path file sebagai argumen ke-2)"
        wc -l src/modules/evaluation/views/EvaluasiTraining.vue src/modules/lms/views/AdminKursusMateri.vue src/modules/training-session/views/PelaksanaanTraining.vue src/modules/lms/views/TesTertulis.vue
      fi ;;
    P2-2)
      file package.json; file .gitignore
      hdr "File ter-track yang seharusnya diabaikan"; git ls-files | grep -E "tsbuildinfo|^dist/" || echo "(tidak ada)"
      hdr "Pemakaian paket ikon"; echo "@lucide/vue: $(grep -rl "@lucide/vue" src | wc -l) file"; echo "lucide-vue-next: $(grep -rl "lucide-vue-next" src | wc -l) file"
      hdr "HelloWorld"; grep -rn "HelloWorld" src || true; ls src/components
      file tailwind.config.js ;;
    P2-3)
      file package.json; file src/services/calculationService.js
      hdr "Mapper (nama fungsi)"; grep -n "^export function" src/services/dataMappers.js ;;
    P2-4) file src/modules/lms/views/TesTertulis.vue; file src/modules/lms/views/KursusDetail.vue ;;
    P2-5) file src/modules/lms/views/AdminBankSoal.vue; file src/modules/lms/views/AdminLaporan.vue ;;
    *) echo "(ID tidak dikenal)" ;;
  esac
  hdr "FORMAT JAWABAN YANG DIMINTA"
  cat <<'FMT'
Berikan perubahan sebagai unified diff per file (siap `git apply`), atau file utuh untuk file baru.
Untuk database: satu file migrasi baru + SQL verifikasi + SQL rollback.
Jangan mencetak ulang file yang tidak berubah. Jelaskan singkat. Di akhir: perintah yang harus kujalankan
(git apply, npm run build) dan apa yang harus kutempel balik bila build gagal. Jika butuh file lain, minta namanya.
FMT
}

TMP="$(mktemp)"
build > "$TMP"
cat "$TMP"
CH=$(wc -c < "$TMP")
echo "[context-pack] $ID: ${CH} karakter (perkiraan kasar ~$((CH/4)) token)" >&2
rm -f "$TMP"
