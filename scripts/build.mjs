import fs from 'node:fs/promises';
await fs.mkdir('dist', {recursive:true});
await fs.cp('public', 'dist', {recursive:true});
await fs.mkdir('dist/vendor', {recursive:true});
await fs.copyFile('node_modules/@supabase/supabase-js/dist/umd/supabase.js', 'dist/vendor/supabase.js');
await fs.writeFile('dist/.nojekyll','');
console.log('Build listo: dist/');
