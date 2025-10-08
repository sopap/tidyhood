const https = require('https');
require('dotenv').config({ path: '.env.local' });

async function runMigration() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
  }

  // Extract project ref from URL
  const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)[1];
  
  const sql = `DROP INDEX IF EXISTS idx_capacity_calendar_no_overlap;
COMMENT ON TABLE capacity_calendar IS 'Individual time slots for partners. Generated from templates or created manually. Overlaps are prevented by check_capacity_conflict() function, not by unique constraints.';`;

  console.log('Running migration 024_fix_capacity_unique_constraint...');
  console.log('SQL:', sql);
  console.log('');

  const options = {
    hostname: `${projectRef}.supabase.co`,
    port: 443,
    path: '/rest/v1/rpc/exec_sql',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': serviceRoleKey,
      'Authorization': `Bearer ${serviceRoleKey}`,
      'Prefer': 'return=representation'
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log('✓ Migration completed successfully!');
          console.log('Response:', data || 'No response body');
          resolve();
        } else {
          console.error('✗ Migration failed with status:', res.statusCode);
          console.error('Response:', data);
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      console.error('✗ Request error:', error);
      reject(error);
    });

    req.write(JSON.stringify({ sql_query: sql }));
    req.end();
  });
}

runMigration().catch(error => {
  console.error('Failed to run migration:', error.message);
  process.exit(1);
});
