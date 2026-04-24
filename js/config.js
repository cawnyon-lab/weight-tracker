// =============================================
// GANTI DENGAN KREDENSIAL SUPABASE KAMU
// Cara dapat: https://supabase.com → project → Settings → API
// =============================================
const SUPABASE_URL = 'https://dsjvmkdwtuwpymzjpkmc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRzanZta2R3dHV3cHltempwa21jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY4OTUzNzksImV4cCI6MjA5MjQ3MTM3OX0.N7o9sNomIREie5wndjWM9ek-xy3KMK8TD3765cr5N10';

// Konfigurasi tracker
const CONFIG = {
  targetDate: '2026-04-30',

  // Ganti nama dan data masing-masing user di sini
  users: {
    user1: {
      name: 'apepipupi',           // ← ganti nama kamu
      initialWeight: 56,     // ← berat awal kamu (kg)
      targetWeight: 50,      // ← target kamu (kg)
      color: '#c45f97',      // warna pink
    },
    user2: {
      name: 'epaaaan',           // ← ganti nama cowok kamu
      initialWeight: 75,     // ← berat awal dia (kg)
      targetWeight: 70,      // ← target dia (kg)
      color: '#166d52',      // warna hijau
    },
  }
};
