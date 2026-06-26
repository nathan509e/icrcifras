const fs = require('fs');

function patchFile(path, replacements) {
  let content = fs.readFileSync(path, 'utf8');
  for (const [old, rep, label] of replacements) {
    // Normalize both to LF for matching, then replace
    const normOld = old.replace(/\r\n/g, '\n');
    const normContent = content.replace(/\r\n/g, '\n');
    if (normContent.includes(normOld)) {
      // Do replacement on normalized, then restore CRLF
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

console.log('=== Patching App.jsx ===');
const app = fs.readFileSync('src/App.jsx', 'utf8');

// 1. handleAddSong
patchFile('src/App.jsx', [[
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
    }
  }`,
  'handleAddSong'
]]);

// 2. currentRawHtml useMemo
patchFile('src/App.jsx', [[
  `  const currentRawHtml = useMemo(() => {
    const content = currentSong?.content
    if (!content) return ''
    return content.includes('<b>') ? stripTomLine(content) : convertPlainTextToHtml(stripTomLine(content))
  }, [currentSong?.content])`,
  `  const currentRawHtml = useMemo(() => {
    const baseContent = instrumentMode === 'violao' && currentSong?.content_guitar
      ? currentSong.content_guitar
      : currentSong?.content
    if (!baseContent) return ''
    return baseContent.includes('<b>') ? stripTomLine(baseContent) : convertPlainTextToHtml(stripTomLine(baseContent))
  }, [currentSong?.content, currentSong?.content_guitar, instrumentMode])`,
  'currentRawHtml useMemo'
]]);

console.log('=== Patching MusicasPage.jsx ===');

// 3. MusicasPage handleAddSong
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
    }
  }`,
  'MusicasPage handleAddSong'
]]);

console.log('Done');
