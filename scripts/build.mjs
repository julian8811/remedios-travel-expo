import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { build } from 'esbuild';
await fs.mkdir('dist', {recursive:true});
await fs.cp('public', 'dist', {recursive:true});
await fs.mkdir('dist/vendor', {recursive:true});
await fs.copyFile('node_modules/@supabase/supabase-js/dist/umd/supabase.js', 'dist/vendor/supabase.js');
// Content-addressed assets prevent old cached styles or modules mixing with new HTML.
const css = await fs.readFile('public/styles.css','utf8');
const cssName = `styles.${createHash('sha256').update(css).digest('hex').slice(0,12)}.css`;
await fs.writeFile(`dist/${cssName}`,css);
const bundled = await build({entryPoints:['public/app.js'],bundle:true,format:'esm',minify:true,write:false,target:'es2022'});
const js = bundled.outputFiles[0].text;
const jsName = `app.${createHash('sha256').update(js).digest('hex').slice(0,12)}.js`;
await fs.writeFile(`dist/${jsName}`,js);
const html = (await fs.readFile('public/index.html','utf8')).replace('./styles.css',`./${cssName}`).replace('./app.js',`./${jsName}`).replace('./vendor/supabase.js','./vendor/supabase.js?v=2.118.0');
await fs.writeFile('dist/index.html',html);
await fs.writeFile('dist/.nojekyll','');
console.log('Build listo: dist/');
