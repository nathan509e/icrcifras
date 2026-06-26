const fs = require('fs');

// Patch App.jsx handleAddSong
let app = fs.readFileSync('src/App.jsx', 'utf8');

const oldHandleAdd = `  const handleAddSong = async () => {
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
  }`;

const newHandleAdd = `  const handleAddSong = async () => {
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
  }`;

if (app.includes(oldHandleAdd)) {
  app = app.replace(oldHandleAdd, newHandleAdd);
  console.log('handleAddSong patched');
} else {
  console.log('handleAddSong NOT FOUND - checking...');
  console.log('Contains handleAddSong:', app.includes('handleAddSong'));
  console.log('Contains !newSongFile:', app.includes('!newSongFile'));
}

// Modify currentRawHtml useMemo to support guitar content
const oldUseMemo = `  const currentRawHtml = useMemo(() => {
    const content = currentSong?.content
    if (!content) return ''
    return content.includes('<b>') ? stripTomLine(content) : convertPlainTextToHtml(stripTomLine(content))
  }, [currentSong?.content])`;

const newUseMemo = `  const currentRawHtml = useMemo(() => {
    const baseContent = instrumentMode === 'violao' && currentSong?.content_guitar
      ? currentSong.content_guitar
      : currentSong?.content
    if (!baseContent) return ''
    return baseContent.includes('<b>') ? stripTomLine(baseContent) : convertPlainTextToHtml(stripTomLine(baseContent))
  }, [currentSong?.content, currentSong?.content_guitar, instrumentMode])`;

if (app.includes(oldUseMemo)) {
  app = app.replace(oldUseMemo, newUseMemo);
  console.log('currentRawHtml useMemo patched');
} else {
  console.log('currentRawHtml useMemo NOT FOUND');
}

fs.writeFileSync('src/App.jsx', app);
console.log('App.jsx saved');

// Now patch MusicasPage.jsx
let mp = fs.readFileSync('src/pages/MusicasPage.jsx', 'utf8');

const oldMpHandleAdd = `  const handleAddSong = async () => {
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
  }`;

const newMpHandleAdd = `  const handleAddSong = async () => {
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
  }`;

if (mp.includes(oldMpHandleAdd)) {
  mp = mp.replace(oldMpHandleAdd, newMpHandleAdd);
  console.log('MusicasPage handleAddSong patched');
} else {
  console.log('MusicasPage handleAddSong NOT FOUND');
}

// Add newSongFileGuitar state to MusicasPage
const oldMpFileState = `  const [newSongFile, setNewSongFile] = useState(null)`;
const newMpFileState = `  const [newSongFile, setNewSongFile] = useState(null)
  const [newSongFileGuitar, setNewSongFileGuitar] = useState(null)`;

if (mp.includes(oldMpFileState) && !mp.includes('newSongFileGuitar')) {
  mp = mp.replace(oldMpFileState, newMpFileState);
  console.log('MusicasPage newSongFileGuitar state added');
} else {
  console.log('MusicasPage newSongFileGuitar state: already exists or not found');
}

// Add fileInputGuitarRef to MusicasPage
const oldMpRef = `  const fileInputRef = useRef(null)`;
const newMpRef = `  const fileInputRef = useRef(null)
  const fileInputGuitarRef = useRef(null)`;

if (mp.includes(oldMpRef) && !mp.includes('fileInputGuitarRef')) {
  mp = mp.replace(oldMpRef, newMpRef);
  console.log('MusicasPage fileInputGuitarRef added');
} else {
  console.log('MusicasPage fileInputGuitarRef: already exists or not found');
}

fs.writeFileSync('src/pages/MusicasPage.jsx', mp);
console.log('MusicasPage.jsx saved');
