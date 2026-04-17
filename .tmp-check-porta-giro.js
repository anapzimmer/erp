const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

function parseEnv(filePath) {
  const txt = fs.readFileSync(filePath, 'utf8');
  const env = {};
  for (const raw of txt.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const idx = line.indexOf('=');
    if (idx < 0) continue;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

(async () => {
  const env = parseEnv(path.join(process.cwd(), '.env.local'));
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    console.log('SEM_ENV');
    return;
  }

  const supabase = createClient(url, key);
  const { data, error } = await supabase
    .from('projetos')
    .select('id,nome,categoria,desenho,criado_em')
    .order('criado_em', { ascending: false })
    .limit(50);

  if (error) {
    console.log('ERRO_PROJETOS', error.message);
    return;
  }

  const portas = (data || []).filter((p) => /giro|porta/i.test(`${p.nome || ''} ${p.categoria || ''} ${p.desenho || ''}`));
  console.log(JSON.stringify(portas.slice(0, 10), null, 2));
})();
