import fs from 'fs'
import { createClient } from '@supabase/supabase-js'

// Parse .env manually
const envContent = fs.readFileSync('.env', 'utf8')
const supabaseUrl = envContent.match(/VITE_SUPABASE_URL\s*=\s*(.*)/)?.[1]?.trim()
const supabaseAnonKey = envContent.match(/VITE_SUPABASE_ANON_KEY\s*=\s*(.*)/)?.[1]?.trim()

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Credentials not found in .env")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

const targetSongs = [
  {
    searchTerm: "Até que o Senhor venha",
    guitarUrl: "https://www.cifraclub.com.br/dunamis-music/ate-que-o-senhor-venha/",
    tecladoUrl: "https://www.cifraclub.com.br/dunamis-music/ate-que-o-senhor-venha/teclado.html"
  },
  {
    searchTerm: "Abba",
    guitarUrl: "https://www.cifraclub.com.br/kemuel/abba/",
    tecladoUrl: "https://www.cifraclub.com.br/kemuel/abba/teclado.html"
  },
  {
    searchTerm: "A mensagem da cruz",
    guitarUrl: "https://www.cifraclub.com.br/harpa-crista/a-mensagem-da-cruz/",
    tecladoUrl: "https://www.cifraclub.com.br/harpa-crista/a-mensagem-da-cruz/teclado.html"
  },
  {
    searchTerm: "Ambiente de glória",
    guitarUrl: "https://www.cifraclub.com.br/ministerio-de-louvor-davi-silva/ambiente-de-gloria/",
    tecladoUrl: "https://www.cifraclub.com.br/ministerio-de-louvor-davi-silva/ambiente-de-gloria/teclado.html"
  },
  {
    searchTerm: "Bondade de Deus",
    guitarUrl: "https://www.cifraclub.com.br/isaias-saad/bondade-de-deus/",
    tecladoUrl: "https://www.cifraclub.com.br/isaias-saad/bondade-de-deus/teclado.html"
  },
  {
    searchTerm: "Cadeias quebrar",
    guitarUrl: "https://www.cifraclub.com.br/soraya-moraes/cadeias-quebrar/",
    tecladoUrl: "https://www.cifraclub.com.br/soraya-moraes/cadeias-quebrar/teclado.html"
  },
  {
    searchTerm: "Canção do Apocalipse",
    guitarUrl: "https://www.cifraclub.com.br/diante-do-trono/cancao-do-apocalipse/",
    tecladoUrl: "https://www.cifraclub.com.br/diante-do-trono/cancao-do-apocalipse/teclado.html"
  }
]

function cleanCifra(cifraContent) {
  if (!cifraContent) return ""
  let content = cifraContent.replace(/<\/div>/gi, '\n')
  content = content.replace(/<br\s*\/?>/gi, '\n')
  
  // Normalize Cifra Club's new <b> tags with attributes to clean <b> tags
  content = content.replace(/<b\b[^>]*>/gi, '<b>')
  
  // Strip all HTML tags except <b> and </b>
  content = content.replace(/<(?!b\b|\/b\b)[^>]+>/gi, '')
  
  content = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim()
  content = content.replace(/^[Aa]fina[cç][aã]o\s*:\s*[^\n]+\n*/mi, '')
  content = content.replace(/^[Tt]uning\s*:\s*[^\n]+\n*/mi, '')
  content = content.replace(/^[Tt]om\s*:\s*[^\n]+\n*/mi, '').trim()
  content = content.replace(/(Capo(?:traste)?(?:\s+na)?\s+\d+ª?\s*casa)\s*([^\n])/i, '$1\n$2')
  return content
}

async function fetchCifra(url) {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    })
    if (!res.ok) return null
    return await res.text()
  } catch (e) {
    console.error(`Failed to fetch ${url}:`, e.message)
    return null
  }
}

function parsePage(html) {
  if (!html) return null

  let songName = ""
  let artistName = ""

  // 1. Parse Title & Artist from og:title (new and old nextjs standard)
  const ogTitleMatch = html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/i)
  if (ogTitleMatch) {
    const cleanTitle = ogTitleMatch[1].replace(/ - Cifra Club$/i, '')
    const parts = cleanTitle.split(' - ')
    if (parts.length >= 2) {
      songName = parts[0].trim()
      artistName = parts[1].trim()
    }
  }

  // Fallback for Title
  if (!songName) {
    const titleMatch = html.match(/<h1[^>]*class="[^"]*t1[^"]*"[^>]*>([\s\S]*?)<\/h1>/i) || 
                       html.match(/class="cifra-char_title">([^<]+)/i) ||
                       html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)
    if (titleMatch) {
      songName = titleMatch[1].replace(/<[^>]+>/g, '').trim()
    }
  }

  // Fallback for Artist
  if (!artistName) {
    const artistMatch = html.match(/<h2[^>]*class="[^"]*t3[^"]*"[^>]*>([\s\S]*?)<\/h2>/i) || 
                        html.match(/class="cifra-char_artist">([^<]+)/i)
    if (artistMatch) {
      const aMatch = artistMatch[1].match(/<a[^>]*>([^<]+)<\/a>/i)
      artistName = aMatch ? aMatch[1].trim() : artistMatch[1].replace(/<[^>]+>/g, '').trim()
    }
  }

  // 2. Parse Tom (Key)
  let tom = ""
  // Try new format first (button with eVroG class and --chord-tone anchor)
  const newTomMatch = html.match(/class="eVroG"\s+data-anchor="--chord-tone"[^>]*>([^<]+)<\/button>/i) ||
                      html.match(/>Tom<!-- -->:<!-- -->\s*<button[^>]*>([^<]+)<\/button>/i)
  if (newTomMatch) {
    tom = newTomMatch[1].trim()
  } else {
    // Fallback to old formats
    const tomMatch = html.match(/id="cifra_tom"[^>]*>([\s\S]*?)<\/span>/i) || 
                     html.match(/class="cifra_tom"[^>]*>([\s\S]*?)<\/button>/i) || 
                     html.match(/tom:\s*<b>([^<]+)<\/b>/i)
    if (tomMatch) {
      tom = tomMatch[1].replace(/<[^>]+>/g, '').replace(/^[Tt]om\s*:\s*/i, '').trim()
    }
  }

  // 3. Parse Pre content (Chords/Lyrics)
  // Try new format pre class first, fallback to generic pre
  const preMatch = html.match(/<pre[^>]*data-chord-content="true"[^>]*>([\s\S]*?)<\/pre>/i) || 
                   html.match(/<pre[^>]*class="_crVx"[^>]*>([\s\S]*?)<\/pre>/i) ||
                   html.match(/<pre[^>]*>([\s\S]*?)<\/pre>/i)
  if (!preMatch) return null

  let cifraContent = cleanCifra(preMatch[1])

  if (tom) {
    cifraContent = `Tom: ${tom}\n\n${cifraContent}`
  }

  // 4. YouTube URL
  let youtubeUrl = ""
  // Try new nextjs inline JSON youtubeID first
  const newYtMatch = html.match(/youtubeID\\*"\s*:\s*\\*"([a-zA-Z0-9_-]{11})/i)
  if (newYtMatch) {
    youtubeUrl = `https://www.youtube.com/watch?v=${newYtMatch[1]}`
  } else {
    // Fallback to old format
    const ytMatch = html.match(/data-youtube-id="([a-zA-Z0-9_-]{11})"/i)
    if (ytMatch) {
      youtubeUrl = `https://www.youtube.com/watch?v=${ytMatch[1]}`
    } else {
      const ytLink = html.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i)
      if (ytLink) youtubeUrl = `https://www.youtube.com/watch?v=${ytLink[1]}`
    }
  }

  return { songName, artistName, cifraContent, tom, youtubeUrl }
}

async function run() {
  // 1. Fetch existing songs
  const { data: existingSongs, error } = await supabase.from('songs').select('name, composer')
  if (error) {
    console.error("Error fetching existing songs:", error)
    process.exit(1)
  }

  const existingMap = new Set(
    existingSongs.map(s => `${s.name.toLowerCase().trim()} - ${(s.composer || '').toLowerCase().trim()}`)
  )

  for (const song of targetSongs) {
    console.log(`Checking "${song.searchTerm}"...`)

    // Fetch Guitar HTML first to parse title and artist
    const htmlGuitar = await fetchCifra(song.guitarUrl)
    if (!htmlGuitar) {
      console.log(`Could not fetch guitar version for ${song.searchTerm}`)
      continue
    }

    const parsedGuitar = parsePage(htmlGuitar)
    if (!parsedGuitar) {
      console.log(`Could not parse guitar version for ${song.searchTerm}`)
      continue
    }

    const songKey = `${parsedGuitar.songName.toLowerCase().trim()} - ${parsedGuitar.artistName.toLowerCase().trim()}`
    if (existingMap.has(songKey)) {
      console.log(`[IGNORE] "${parsedGuitar.songName}" by "${parsedGuitar.artistName}" already exists in DB.`)
      continue
    }

    console.log(`[IMPORTING] "${parsedGuitar.songName}" by "${parsedGuitar.artistName}"...`)

    // Fetch Keyboard HTML
    const htmlTeclado = await fetchCifra(song.tecladoUrl)
    const parsedTeclado = parsePage(htmlTeclado)

    const finalKeyboard = parsedTeclado?.cifraContent || parsedGuitar.cifraContent
    const finalGuitar = parsedGuitar.cifraContent || parsedTeclado?.cifraContent

    const row = {
      name: parsedGuitar.songName,
      composer: parsedGuitar.artistName,
      content: finalKeyboard,
      content_guitar: finalGuitar,
      key: parsedGuitar.tom || 'G',
      youtube_url: parsedGuitar.youtubeUrl || ""
    }

    const { error: insertError } = await supabase.from('songs').insert([row])
    if (insertError) {
      console.error(`Error inserting "${row.name}":`, insertError)
    } else {
      console.log(`[SUCCESS] Imported "${row.name}" successfully!`)
    }
  }

  console.log("All checks and imports completed.")
}

run()
