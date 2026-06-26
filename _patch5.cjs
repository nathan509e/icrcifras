const fs = require('fs');

function patchFile(path, replacements) {
  let content = fs.readFileSync(path, 'utf8');
  const hadCRLF = content.includes('\r\n');
  // Normalize to LF
  content = content.replace(/\r\n/g, '\n');
  for (const [old, rep, label] of replacements) {
    const normOld = old.replace(/\r\n/g, '\n');
    if (content.includes(normOld)) {
      content = content.replace(normOld, rep);
      console.log(`  [OK] ${label}`);
    } else {
      console.log(`  [SKIP] ${label}`);
    }
  }
  // Restore CRLF if original had it
  if (hadCRLF) content = content.replace(/\n/g, '\r\n');
  fs.writeFileSync(path, content);
}

// 1. Add instrument toggle in App.jsx sidebar
console.log('=== App.jsx: instrument toggle ===');
patchFile('src/App.jsx', [[
  `              <div className="sidebar-section">\n                <h3 className="sidebar-title">Violino</h3>`,
  `              <div className="sidebar-section">\n                <h3 className="sidebar-title">Instrumento</h3>\n                <div className="tool-row" style={{ gap: '6px' }}>\n                  <button\n                    className={\`tool-btn \${instrumentMode === 'teclado' ? 'active' : ''}\`}\n                    onClick={() => setInstrumentMode('teclado')}\n                    style={{ fontSize: '12px', padding: '4px 10px' }}\n                  >🎹 Teclado</button>\n                  <button\n                    className={\`tool-btn \${instrumentMode === 'violao' ? 'active' : ''}\`}\n                    onClick={() => setInstrumentMode('violao')}\n                    style={{ fontSize: '12px', padding: '4px 10px' }}\n                  >🎸 Violão</button>\n                </div>\n                <span className="tool-hint">{instrumentMode === 'violao' ? 'Cifra violão' : 'Cifra teclado'}</span>\n              </div>\n\n              <div className="sidebar-section">\n                <h3 className="sidebar-title">Violino</h3>`,
  'instrument toggle'
]]);

// 2. Add guitar file input in App.jsx add modal
console.log('=== App.jsx: guitar file input in modal ===');

// Find the existing file input area and add guitar one after it
patchFile('src/App.jsx', [[
  `                <div className="modal-file-area" onClick={() => fileInputRef.current?.click()}>`,
  `                <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '2px', display: 'block' }}>Cifra Teclado (txt):</label>\n                <div className="modal-file-area" onClick={() => fileInputRef.current?.click()}>`,
  'teclado label'
]]);

// After the file input ref closing, add guitar file input
patchFile('src/App.jsx', [[
  `                <input\n                  type="file"\n                  accept=".txt,.html"\n                  ref={fileInputRef}\n                  style={{ display: 'none' }}\n                  onChange={(e) => setNewSongFile(e.target.files[0] || null)}\n                />`,
  `                <input\n                  type="file"\n                  accept=".txt,.html"\n                  ref={fileInputRef}\n                  style={{ display: 'none' }}\n                  onChange={(e) => setNewSongFile(e.target.files[0] || null)}\n                />\n\n                <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '10px', marginBottom: '2px', display: 'block' }}>Cifra Violão (txt):</label>\n                <div className="modal-file-area" onClick={() => fileInputGuitarRef.current?.click()}>\n                  <span className="file-icon">📄</span>\n                  {newSongFileGuitar ? (\n                    <span className="file-name">{newSongFileGuitar.name}</span>\n                  ) : (\n                    <span className="file-placeholder">Clique para selecionar arquivo .txt (violão)</span>\n                  )}\n                </div>\n                <input\n                  type="file"\n                  accept=".txt,.html"\n                  ref={fileInputGuitarRef}\n                  style={{ display: 'none' }}\n                  onChange={(e) => setNewSongFileGuitar(e.target.files[0] || null)}\n                />`,
  'guitar file input'
]]);

// 3. MusicasPage.jsx guitar file input
console.log('=== MusicasPage.jsx: guitar file input ===');

patchFile('src/pages/MusicasPage.jsx', [[
  `                <div className="modal-file-area" onClick={() => fileInputRef.current?.click()}>`,
  `                <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '2px', display: 'block' }}>Cifra Teclado (txt):</label>\n                <div className="modal-file-area" onClick={() => fileInputRef.current?.click()}>`,
  'teclado label'
]]);

patchFile('src/pages/MusicasPage.jsx', [[
  `                <input\n                  type="file"\n                  accept=".txt,.html"\n                  ref={fileInputRef}\n                  style={{ display: 'none' }}\n                  onChange={(e) => setNewSongFile(e.target.files[0] || null)}\n                />`,
  `                <input\n                  type="file"\n                  accept=".txt,.html"\n                  ref={fileInputRef}\n                  style={{ display: 'none' }}\n                  onChange={(e) => setNewSongFile(e.target.files[0] || null)}\n                />\n\n                <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '10px', marginBottom: '2px', display: 'block' }}>Cifra Violão (txt):</label>\n                <div className="modal-file-area" onClick={() => fileInputGuitarRef.current?.click()}>\n                  <span className="file-icon">📄</span>\n                  {newSongFileGuitar ? (\n                    <span className="file-name">{newSongFileGuitar.name}</span>\n                  ) : (\n                    <span className="file-placeholder">Clique para selecionar arquivo .txt (violão)</span>\n                  )}\n                </div>\n                <input\n                  type="file"\n                  accept=".txt,.html"\n                  ref={fileInputGuitarRef}\n                  style={{ display: 'none' }}\n                  onChange={(e) => setNewSongFileGuitar(e.target.files[0] || null)}\n                />`,
  'guitar file input'
]]);

console.log('All patches done');
