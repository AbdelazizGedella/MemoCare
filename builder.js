function el(id){ return document.getElementById(id) }
const modsWrap = el('mods');
const tpl = document.getElementById('mod-row');
function addRow(data={}){
  const node = tpl.content.firstElementChild.cloneNode(true);
  node.querySelector('.mi-id').value = data.id || '';
  node.querySelector('.mi-label').value = data.label || '';
  node.querySelector('.mi-ctas').value = data.ctas || '';
  node.querySelector('.mi-note').value = data.note || '';
  node.querySelector('.btn-remove').addEventListener('click', ()=> node.remove());
  modsWrap.appendChild(node);
}
function collect(){
  const id = el('m-id').value.trim();
  const title = el('m-title').value.trim();
  const keywords = el('m-keywords').value.split(',').map(s=>s.trim()).filter(Boolean);
  const hints = el('m-hints').value.split(',').map(s=>s.trim()).filter(Boolean);
  const mods = Array.from(modsWrap.querySelectorAll('.mod')).map(row => ({
    id: row.querySelector('.mi-id').value.trim(),
    label: row.querySelector('.mi-label').value.trim(),
    effect: { ctas: Number(row.querySelector('.mi-ctas').value) || null },
    note: row.querySelector('.mi-note').value.trim() || undefined,
  })).filter(x=>x.id && x.label && x.effect.ctas);
  if(!id || !title || !mods.length) throw new Error('Please fill ID, Title and at least one Modifier with CTAS.');
  return { id, title, keywords, vitalsHints: hints, modifiers: mods };
}
function saveToBrowser(mod){
  const key = 'TX_CUSTOM_MODULES';
  const arr = JSON.parse(localStorage.getItem(key) || '[]');
  const filtered = arr.filter(x => x.id !== mod.id);
  filtered.push(mod);
  localStorage.setItem(key, JSON.stringify(filtered));
  alert('Saved to browser. It will appear in the app now.');
}
function exportJS(mod){
  const content = `export default ${JSON.stringify(mod, null, 2).replace('"effect": {', 'effect: {')};\n`;
  const blob = new Blob([content], {type:'text/javascript'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `mod_${mod.id}.js`;
  a.click();
}
el('btn-add-mod').addEventListener('click', ()=>addRow());
el('btn-save-browser').addEventListener('click', ()=>{ try{ const mod=collect(); saveToBrowser(mod) }catch(e){ alert(e.message) } });
el('btn-export-js').addEventListener('click', ()=>{ try{ const mod=collect(); exportJS(mod) }catch(e){ alert(e.message) } });
addRow();