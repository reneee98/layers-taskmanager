const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Polyfill fetch pre Node.js
if (typeof fetch === 'undefined') {
  global.fetch = require('node-fetch');
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables!');
  console.error('NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl);
  console.error('SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function listUsers() {
  try {
    console.log('🔍 Načítavam zoznam používateľov...\n');
    
    // Najprv skús získať auth.users (to by malo fungovať s service role)
    console.log('📋 Načítavam používateľov z auth.users...');
    const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();

    if (authError) {
      console.error('❌ Chyba pri načítaní auth.users:', authError);
      return;
    }

    if (!users || users.length === 0) {
      console.log('⚠️  Žiadni používatelia v auth.users');
      console.log('📋 Skúšam načítať z profiles tabuľky...');
    } else {
      console.log(`✅ Našiel som ${users.length} používateľov v auth.users\n`);
    }
    
    // Získaj všetkých používateľov z profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email, display_name, role, created_at')
      .order('created_at', { ascending: false });

    if (profilesError) {
      console.error('⚠️  Chyba pri načítaní profiles:', profilesError.message);
      // Pokračuj len s auth.users ak profiles zlyhá
    }

    const totalUsers = users?.length || 0;
    const totalProfiles = profiles?.length || 0;
    
    console.log(`📊 Celkový počet používateľov v auth.users: ${totalUsers}`);
    console.log(`📊 Celkový počet používateľov v profiles: ${totalProfiles}\n`);
    console.log('='.repeat(80));
    
    if ((!users || users.length === 0) && (!profiles || profiles.length === 0)) {
      console.log('⚠️  Žiadni používatelia v databáze.');
      return;
    }

    // Zobraz používateľov z auth.users (hlavný zdroj)
    if (users && users.length > 0) {
      console.log('\n👥 POUŽÍVATELIA Z AUTH.USERS:\n');
      
      // Vytvor mapu profiles pre rýchle vyhľadávanie
      const profilesMap = new Map();
      if (profiles) {
        profiles.forEach(p => {
          profilesMap.set(p.id, p);
        });
      }

      users.forEach((user, index) => {
        const profile = profilesMap.get(user.id);
        console.log(`\n${index + 1}. ${profile?.display_name || user.email || 'Bez mena'}`);
        console.log(`   📧 Email: ${user.email || 'N/A'}`);
        console.log(`   🆔 ID: ${user.id}`);
        console.log(`   👤 Role (z profiles): ${profile?.role || 'N/A'}`);
        console.log(`   📅 Vytvorené: ${user.created_at ? new Date(user.created_at).toLocaleString('sk-SK') : 'N/A'}`);
        console.log(`   ✅ Email potvrdený: ${user.email_confirmed_at ? '✓ (' + new Date(user.email_confirmed_at).toLocaleString('sk-SK') + ')' : '✗'}`);
        console.log(`   🔐 Posledné prihlásenie: ${user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString('sk-SK') : 'Nikdy'}`);
        if (profile) {
          console.log(`   📝 Display Name: ${profile.display_name || 'N/A'}`);
        } else {
          console.log(`   ⚠️  Chýba profil v profiles tabuľke`);
        }
        console.log('-'.repeat(80));
      });

      console.log(`\n✅ Zobrazených ${users.length} používateľov z auth.users.\n`);
    } else if (profiles && profiles.length > 0) {
      // Ak nie sú auth.users, zobraz aspoň profiles
      console.log('\n👥 POUŽÍVATELIA Z PROFILES:\n');
      profiles.forEach((profile, index) => {
        console.log(`\n${index + 1}. ${profile.display_name || 'Bez mena'}`);
        console.log(`   📧 Email: ${profile.email || 'N/A'}`);
        console.log(`   🆔 ID: ${profile.id}`);
        console.log(`   👤 Role: ${profile.role || 'N/A'}`);
        console.log(`   📅 Vytvorené: ${profile.created_at ? new Date(profile.created_at).toLocaleString('sk-SK') : 'N/A'}`);
        console.log('-'.repeat(80));
      });
      console.log(`\n✅ Zobrazených ${profiles.length} používateľov z profiles.\n`);
    }

  } catch (error) {
    console.error('❌ Neočakávaná chyba:', error);
  }
}

listUsers();

