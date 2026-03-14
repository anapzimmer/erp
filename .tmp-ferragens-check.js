const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const env = fs.readFileSync('.env.local', 'utf8').split(/\r?\n/);
for (const line of env) {
  const match = line.match(/^(NEXT_PUBLIC_SUPABASE_URL|NEXT_PUBLIC_SUPABASE_ANON_KEY)=(.*)$/);
  if (match) process.env[match[1]] = match[2];
}

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

(async () => {
  const codigos = ['CAN625', 'SUP626', 'NYL314', 'NYL042'];
  const { data, error } = await supabase
    .from('ferragens')
    .select('empresa_id,codigo,nome,cores,preco')
    .in('codigo', codigos)
    .order('codigo', { ascending: true });

  if (error) {
    console.error('SUPABASE_ERROR', error);
    process.exit(1);
  }

  console.log(JSON.stringify(data, null, 2));
})();
