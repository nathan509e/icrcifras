const fs = require('fs');

function patchFile(path, replacements) {
  let content = fs.readFileSync(path, 'utf8');
  for (const [old, rep, label] of replacements) {
    const normOld = old.replace(/\r\n/g, '\n');
    const normContent = content.replace(/\r\n/g, '\n');
    if (normContent.includes(normOld)) {
      const normNew = rep.replace(/\r\n/g, '\n');
      const result = normContent.replace(normOld, normNew).replace(/\n/g, '\r\n');
      content = result;
      console.log(`  [OK] ${label}`);
    } else {
      console.log(`  [SKIP] ${label} - not found`);
    }
  }
  fs.writeFileSync(path, content);
}

console.log('=== Patching MusicasPage.jsx ===');

patchFile('src/pages/MusicasPage.jsx', [[
  `  const handleAddSong = async () => {
    if (!newSongName.trim() || !newSongFile) return
    const content = await newSongFile.text()
    const detectedKey = detectKey(content)
    const saved = await saveSong(newSongName.trim(), content, newSongYoutubeUrl.trim(), newSongComposer.trim(), detectedKey)
    if (saved) {
      setSongs(prev => [saved, ...prev])
      setShowAddModal(false)
      setNewSongName('')
      setNewSongComposer('')
      setNewSongFile(null)
      setNewSongYoutubeUrl('')
      setImportUrl('')
      setImportHtml('')
      setShowImportHtml(false)
    }
  }`,
  `  const handleAddSong = async () => {
    if (!newSongName.trim() || (!newSongFile && !newSongFileGuitar)) return
    let content = ''
    if (newSongFile) content = await newSongFile.text()
    let contentGuitar = ''
    if (newSongFileGuitar) contentGuitar = await newSongFileGuitar.text()
    const detectedKey = detectKey(content || contentGuitar)
    const saved = await saveSong(newSongName.trim(), content, newSongYoutubeUrl.trim(), newSongComposer.trim(), detectedKey, contentGuitar)
    if (saved) {
      setSongs(prev => [saved, ...prev])
      setShowAddModal(false)
      setNewSongName('')
      setNewSongComposer('')
      setNewSongFile(null)
      setNewSongFileGuitar(null)
      setNewSongYoutubeUrl('')
      setImportUrl('')
      setImportHtml('')
      setShowImportHtml(false)
    }
  }`,
  'MusicasPage handleAddSong'
]]);

console.log('Done');
