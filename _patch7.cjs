const fs = require('fs');
let c = fs.readFileSync('src/App.jsx', 'utf8');

// 1. Remove the instrument toggle button from bottom bar
const instrumentBtn = `        <button\r\n          className={\`mobile-menu-item \${instrumentMode === "violao" ? "active" : ""}\`}\r\n          onClick={() => setInstrumentMode(instrumentMode === "teclado" ? "violao" : "teclado")}\r\n          title={instrumentMode === "teclado" ? "Mudar para Violão" : "Mudar para Teclado"}\r\n        >\r\n          <span style={{fontSize:20}}>{instrumentMode === "teclado" ? "🎹" : "🎸"}</span>\r\n          <span>{instrumentMode === "teclado" ? "Teclado" : "Violão"}</span>\r\n        </button>\r\n\r\n        <button\r\n          className={\`mobile-menu-item \${activeMobilePanel === 'opcoes' ? 'active' : ''}\`}`;

const justOpcoesBtn = `        <button\r\n          className={\`mobile-menu-item \${activeMobilePanel === 'opcoes' ? 'active' : ''}\`}`;

if (c.includes(instrumentBtn)) {
  c = c.replace(instrumentBtn, justOpcoesBtn);
  console.log('1. Removed instrument button from bottom bar');
} else {
  console.log('1. WARN: instrument button not found exactly');
}

// 2. Add instrument toggle inside the "opcoes" panel (after Cantor toggle)
const afterCantor = `                <div className="mobile-panel-item">\r\n                  <span>Cantor</span>\r\n                  <label className="toggle-switch">\r\n                    <input type="checkbox" checked={singerMode} onChange={(e) => setSingerMode(e.target.checked)} />\r\n                    <span className="toggle-track"></span>\r\n                  </label>\r\n                </div>`;

const afterCantorPlus = `                <div className="mobile-panel-item">\r\n                  <span>Cantor</span>\r\n                  <label className="toggle-switch">\r\n                    <input type="checkbox" checked={singerMode} onChange={(e) => setSingerMode(e.target.checked)} />\r\n                    <span className="toggle-track"></span>\r\n                  </label>\r\n                </div>\r\n\r\n                <div className="mobile-panel-item">\r\n                  <span>{instrumentMode === "teclado" ? "🎹" : "🎸"} {instrumentMode === "teclado" ? "Teclado" : "Violão"}</span>\r\n                  <label className="toggle-switch">\r\n                    <input type="checkbox" checked={instrumentMode === "violao"} onChange={(e) => setInstrumentMode(e.target.checked ? "violao" : "teclado")} />\r\n                    <span className="toggle-track"></span>\r\n                  </label>\r\n                </div>`;

if (c.includes(afterCantor)) {
  c = c.replace(afterCantor, afterCantorPlus);
  console.log('2. Added instrument toggle inside opcoes panel');
} else {
  console.log('2. WARN: Cantor block not found exactly');
}

// 3. Reduce auto-scroll speed: change multiplier from 0.6 to 0.35
const oldSpeed = 'const speed = autoScrollSpeed * 0.6';
const newSpeed = 'const speed = autoScrollSpeed * 0.35';
if (c.includes(oldSpeed)) {
  c = c.replace(oldSpeed, newSpeed);
  console.log('3. Reduced auto-scroll speed multiplier from 0.6 to 0.35');
} else {
  console.log('3. WARN: speed line not found');
}

fs.writeFileSync('src/App.jsx', c, 'utf8');
console.log('Done!');
