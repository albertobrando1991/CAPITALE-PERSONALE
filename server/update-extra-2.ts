import https from 'https';
import fs from 'fs';

// Items requested by user
const items = [
  { numero: "001G0429", data: "2001-10-20" },
  { numero: "086U0065", data: "1986-03-15" }
];

async function fetchTitle(item) {
  const url = `https://www.normattiva.it/atto/caricaDettaglioAtto?atto.dataPubblicazioneGazzetta=${item.data}&atto.codiceRedazionale=${item.numero}&atto.articolo.numero=0&atto.articolo.sottoArticolo=1&atto.articolo.sottoArticolo1=0&qId=57a73178-eddb-4c58-b6de-a1e3bdf485d1`;
  
  return new Promise((resolve) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        // Extract title using simple regex
        const titleMatch = data.match(/<div class="titolo_atto_completo">([\s\S]*?)<\/div>/i) || data.match(/<title>([\s\S]*?)<\/title>/i);
        let title = titleMatch ? titleMatch[1].replace(/<[^>]*>/g, '').trim() : 'Titolo non trovato';
        
        // Clean up title
        title = title.replace(/\s+/g, ' ').replace(' - Normattiva', '');
        
        resolve({
          ...item,
          titolo: title,
          urlNormattiva: url
        });
      });
    }).on('error', (err) => {
      console.error(`Error fetching ${item.numero}: ${err.message}`);
      resolve({ ...item, titolo: 'Errore recupero titolo', urlNormattiva: url });
    });
  });
}

async function main() {
  console.log('Fetching titles for', items.length, 'items...');
  const results = [];
  
  // Process in chunks
  for (let i = 0; i < items.length; i += 5) {
    const chunk = items.slice(i, i + 5);
    const chunkResults = await Promise.all(chunk.map(fetchTitle));
    results.push(...chunkResults);
    console.log(`Processed ${Math.min(i + 5, items.length)}/${items.length}`);
    await new Promise(r => setTimeout(r, 1000));
  }

  // Load existing extra items
  try {
    const fileContent = fs.readFileSync('server/seed-extra.ts', 'utf8');
    
    // Insert new items before the closing "];"
    const arrayEndIndex = fileContent.lastIndexOf('];');
    if (arrayEndIndex !== -1) {
        const newItemsString = results.map(r => `  {
    urn: 'urn:nir:stato:atto:${r.data};${r.numero}',
    tipo: 'Atto',
    numero: '${r.numero}',
    anno: ${parseInt(r.data.substring(0, 4))},
    data: '${r.data}',
    titolo: "${r.titolo.replace(/"/g, '\\"')}",
    titoloBreve: "${r.titolo.substring(0, 50).replace(/"/g, '\\"')}...",
    keywords: ['normativa', 'extra'],
    urlNormattiva: '${r.urlNormattiva}',
    gazzettaUfficiale: ''
  }`).join(',\n');
  
        const newContent = fileContent.substring(0, arrayEndIndex) + ',\n' + newItemsString + '\n];';
        fs.writeFileSync('server/seed-extra.ts', newContent);
        console.log('Done! Updated server/seed-extra.ts');
    } else {
        console.error('Could not find end of array in server/seed-extra.ts');
    }

  } catch (err) {
      console.error('Error reading/writing seed-extra.ts', err);
  }
}

main();
