
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function getAdmins() {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('email, role')
    .eq('role', 'admin')

  if (error) {
    console.error('Error fetching admins:', error)
    process.exit(1)
  }

  if (data.length === 0) {
    console.log('No users found with role "admin".')
  } else {
    console.log('Admin users found:')
    console.table(data)
  }
}

getAdmins()
