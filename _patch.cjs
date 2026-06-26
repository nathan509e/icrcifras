const fs = require('fs');
let c = fs.readFileSync('src/App.jsx', 'utf8');

const anchor = `        <button\r\n          className={\`mobile-menu-item \${activeMobilePanel === 'opcoes' ? 'active' : ''}\`}`;

const toggle = `        <button\r\n          className={\`mobile-menu-item \${instrumentMode === "violao" ? "active" : ""}\`}\r\n          onClick={() => setInstrumentMode(instrumentMode === "teclado" ? "violao" : "teclado")}\r\n          title={instrumentMode === "teclado" ? "Mudar para Viol\u00e3o" : "Mudar para Teclado"}\r\n        >\r\n          <span style={{fontSize:20}}>{instrumentMode === "teclado" ? "\ud83c\udfb9" : "\ud83c\udfb8"}</span>\r\n          <span>{instrumentMode === "teclado" ? "Teclado" : "Viol\u00e3o"}</span>\r\n        </button>\r\n\r\n` + anchor;

if (c.includes(anchor)) {
  c = c.replace(anchor, toggle);
  fs.writeFileSync('src/App.jsx', c);
  console.log('ADDED toggle to bottom bar');
} else {
  console.log('NOT FOUND');
  // Debug: show what's around line 2290
  const lines = c.split('\n');
  for (let i = 2288; i <= 2296; i++) {
    console.log((i+1) + ': ' + JSON.stringify(lines[i]));
  }
}
