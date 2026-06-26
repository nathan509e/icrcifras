const fs = require('fs');

function patchFile(path, replacements) {
  let content = fs.readFileSync(path, 'utf8');
  const hadCRLF = content.includes('\r\n');
  content = content.replace(/\r\n/g, '\n');
  for (const [old, rep, label] of replacements) {
    const normOld = old.replace(/\r\n/g, '\n');
    if (content.includes(normOld)) {
      content = content.replace(normOld, rep);
      console.log(`  [OK] ${label}`);
    } else {
      console.log(`  [SKIP] ${label}`);
      // Debug: show first 80 chars of what we're looking for
      console.log(`    Looking for: ${normOld.substring(0, 80)}...`);
    }
  }
  if (hadCRLF) content = content.replace(/\n/g, '\r\n');
  fs.writeFileSync(path, content);
}

// App.jsx - guitar file input in add modal
console.log('=== App.jsx: guitar file input ===');
patchFile('src/App.jsx', [[
  `<label className="modal-label">Arquivo TXT</label>
              <div className="modal-file-area" onClick={() => fileInputRef.current?.click()}>
                {newSongFile ? (
                  <span className="modal-file-name">{newSongFile.name}</span>
                ) : (
                  <span className="modal-file-placeholder">Clique para selecionar um arquivo .txt</span>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt"
                style={{ display: 'none' }}
                onChange={e => {
                  const file = e.target.files[0]
                  if (file && file.name.endsWith('.txt')) setNewSongFile(file)
                }}
              />`,
  `<label className="modal-label">Cifra Teclado (txt)</label>
              <div className="modal-file-area" onClick={() => fileInputRef.current?.click()}>
                {newSongFile ? (
                  <span className="modal-file-name">{newSongFile.name}</span>
                ) : (
                  <span className="modal-file-placeholder">Clique para selecionar um arquivo .txt</span>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt"
                style={{ display: 'none' }}
                onChange={e => {
                  const file = e.target.files[0]
                  if (file && file.name.endsWith('.txt')) setNewSongFile(file)
                }}
              />
              <label className="modal-label" style={{ marginTop: '10px' }}>Cifra Violão (txt)</label>
              <div className="modal-file-area" onClick={() => fileInputGuitarRef.current?.click()}>
                {newSongFileGuitar ? (
                  <span className="modal-file-name">{newSongFileGuitar.name}</span>
                ) : (
                  <span className="modal-file-placeholder">Clique para selecionar arquivo .txt (violão)</span>
                )}
              </div>
              <input
                ref={fileInputGuitarRef}
                type="file"
                accept=".txt"
                style={{ display: 'none' }}
                onChange={e => {
                  const file = e.target.files[0]
                  if (file && file.name.endsWith('.txt')) setNewSongFileGuitar(file)
                }}
              />`,
  'App.jsx guitar file input'
]]);

// MusicasPage.jsx - guitar file input in add modal
console.log('=== MusicasPage.jsx: guitar file input ===');

// First check what the modal looks like
const mp = fs.readFileSync('src/pages/MusicasPage.jsx', 'utf8').replace(/\r\n/g, '\n');
const idx = mp.indexOf('modal-file-area');
if (idx >= 0) {
  console.log('  Found modal-file-area at char', idx);
  console.log('  Context:', mp.substring(idx - 100, idx + 200));
}

patchFile('src/pages/MusicasPage.jsx', [[
  `<label className="modal-label">Arquivo TXT</label>
              <div className="modal-file-area" onClick={() => fileInputRef.current?.click()}>
                {newSongFile ? (
                  <span className="modal-file-name">{newSongFile.name}</span>
                ) : (
                  <span className="modal-file-placeholder">Clique para selecionar um arquivo .txt</span>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt"
                style={{ display: 'none' }}
                onChange={e => {
                  const file = e.target.files[0]
                  if (file && file.name.endsWith('.txt')) setNewSongFile(file)
                }}
              />`,
  `<label className="modal-label">Cifra Teclado (txt)</label>
              <div className="modal-file-area" onClick={() => fileInputRef.current?.click()}>
                {newSongFile ? (
                  <span className="modal-file-name">{newSongFile.name}</span>
                ) : (
                  <span className="modal-file-placeholder">Clique para selecionar um arquivo .txt</span>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt"
                style={{ display: 'none' }}
                onChange={e => {
                  const file = e.target.files[0]
                  if (file && file.name.endsWith('.txt')) setNewSongFile(file)
                }}
              />
              <label className="modal-label" style={{ marginTop: '10px' }}>Cifra Violão (txt)</label>
              <div className="modal-file-area" onClick={() => fileInputGuitarRef.current?.click()}>
                {newSongFileGuitar ? (
                  <span className="modal-file-name">{newSongFileGuitar.name}</span>
                ) : (
                  <span className="modal-file-placeholder">Clique para selecionar arquivo .txt (violão)</span>
                )}
              </div>
              <input
                ref={fileInputGuitarRef}
                type="file"
                accept=".txt"
                style={{ display: 'none' }}
                onChange={e => {
                  const file = e.target.files[0]
                  if (file && file.name.endsWith('.txt')) setNewSongFileGuitar(file)
                }}
              />`,
  'MusicasPage.jsx guitar file input'
]]);

console.log('Done');
