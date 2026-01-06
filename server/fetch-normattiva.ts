import https from 'https';
import fs from 'fs';

const items = [
  { id: 1, numero: "042U0262", data: "1942-04-04" },
  { id: 2, numero: "042U0318", data: "1942-04-17" },
  { id: 3, numero: "000G0392", data: "2000-11-24" },
  { id: 4, numero: "001G0293", data: "2001-06-19" },
  { id: 5, numero: "002G0093", data: "2002-04-15" },
  { id: 6, numero: "042U0504", data: "1942-05-26" },
  { id: 7, numero: "004G0058", data: "2004-02-14" },
  { id: 8, numero: "092G0205", data: "1992-03-04" },
  { id: 9, numero: "010G0057", data: "2010-03-23" },
  { id: 10, numero: "14G00001", data: "2014-01-08" },
  { id: 11, numero: "096G0016", data: "1996-02-03" },
  { id: 12, numero: "071U0804", data: "1971-10-08" },
  { id: 13, numero: "005G0055", data: "2005-03-04" },
  { id: 14, numero: "002G0250", data: "2002-10-08" },
  { id: 15, numero: "080U0967", data: "1981-01-19" },
  { id: 16, numero: "009G0069", data: "2009-06-19" },
  { id: 17, numero: "22G00158", data: "2022-10-17" },
  { id: 18, numero: "000G0410", data: "2000-12-07" },
  { id: 19, numero: "098G0443", data: "1998-11-07" },
  { id: 20, numero: "074U0594", data: "1974-11-30" },
  { id: 21, numero: "029U0499", data: "1929-04-18" },
  { id: 22, numero: "15G00002", data: "2015-01-08" },
  { id: 23, numero: "095G0256", data: "1995-06-03" },
  { id: 24, numero: "094G0037", data: "1994-01-17" },
  { id: 25, numero: "092G0539", data: "1992-12-21" },
  { id: 26, numero: "094G0431", data: "1994-06-11" },
  { id: 27, numero: "000G0024", data: "2000-01-18" },
  { id: 28, numero: "077U0751", data: "1977-10-20" },
  { id: 29, numero: "072U0242", data: "1972-06-23" },
  { id: 30, numero: "041U1368", data: "1941-12-24" },
  { id: 31, numero: "20G00167", data: "2020-11-05" },
  { id: 32, numero: "073U0155", data: "1973-05-02" },
  { id: 33, numero: "20G00043", data: "2020-04-08" },
  { id: 34, numero: "040U1443", data: "1940-10-28" },
  { id: 35, numero: "098G0073", data: "1998-03-26" },
  { id: 36, numero: "044U0287", data: "1944-11-09" },
  { id: 37, numero: "24G00183", data: "2024-11-11" },
  { id: 38, numero: "090G0386", data: "1990-12-01" },
  { id: 39, numero: "010G0127", data: "2010-07-07" },
  { id: 40, numero: "011G0109", data: "2011-05-13" },
  { id: 41, numero: "005G0200", data: "2005-08-31" },
  { id: 42, numero: "011G0192", data: "2011-09-21" },
  { id: 43, numero: "003G0010", data: "2003-01-22" },
  { id: 44, numero: "041U0633", data: "1941-07-16" },
  { id: 45, numero: "029U1159", data: "1929-07-16" },
  { id: 46, numero: "089G0031", data: "1989-01-26" },
  { id: 47, numero: "23G00035", data: "2023-03-17" },
  { id: 48, numero: "000G0442", data: "2000-12-30" },
  { id: 49, numero: "002G0265", data: "2002-10-23" },
  { id: 50, numero: "095G0399", data: "1995-08-29" },
  { id: 51, numero: "095G0475", data: "1995-10-21" },
  { id: 52, numero: "000G0300", data: "2000-09-04" },
  { id: 53, numero: "016U0968", data: "1916-08-12" },
  { id: 54, numero: "012G0242", data: "2012-12-17" },
  { id: 55, numero: "070U0727", data: "1970-10-20" },
  { id: 56, numero: "069U0694", data: "1969-10-24" },
  { id: 57, numero: "069U0827", data: "1969-11-28" },
  { id: 58, numero: "19G00007", data: "2019-02-14" },
  { id: 59, numero: "048U0483", data: "1948-05-20" },
  { id: 60, numero: "17G00096", data: "2017-06-13" },
  { id: 61, numero: "086U0487", data: "1986-08-18" },
  { id: 62, numero: "065U2641", data: "1865-12-20" },
  { id: 63, numero: "098G0261", data: "1998-07-08" },
  { id: 64, numero: "18G00020", data: "2018-02-01" },
  { id: 65, numero: "19G00126", data: "2019-10-16" }
];

async function fetchTitle(item) {
  const url = 'https://www.normattiva.it/atto/caricaDettaglioAtto?atto.dataPubblicazioneGazzetta=' + item.data + '&atto.codiceRedazionale=' + item.numero + '&atto.articolo.numero=0&atto.articolo.sottoArticolo=1&atto.articolo.sottoArticolo1=0&qId=57a73178-eddb-4c58-b6de-a1e3bdf485d1';
  
  return new Promise((resolve) => {
    const req = https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        // Extract title
        const titleMatch = data.match(/<div class="titolo_atto_completo">([\s\S]*?)<\/div>/i) || data.match(/<title>([\s\S]*?)<\/title>/i);
        let title = titleMatch ? titleMatch[1].replace(/<[^>]*>/g, '').trim() : 'Titolo non trovato';
        
        title = title.replace(/\s+/g, ' ').replace(' - Normattiva', '');
        
        resolve({
          ...item,
          titolo: title,
          urlNormattiva: url
        });
      });
    });
    
    req.on('error', (err) => {
      console.error('Error fetching ' + item.numero + ': ' + err.message);
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
    console.log('Processed ' + Math.min(i + 5, items.length) + '/' + items.length);
    // Wait a bit
    await new Promise(r => setTimeout(r, 1000));
  }
  
  // Generate code
  const code = 'export const extraNorme = ' + JSON.stringify(results.map(r => ({
    urn: 'urn:nir:stato:atto:' + r.data + ';' + r.numero, 
    tipo: 'Atto', 
    numero: r.numero,
    anno: parseInt(r.data.substring(0, 4)),
    data: r.data,
    titolo: r.titolo,
    titoloBreve: r.titolo.substring(0, 50) + '...',
    keywords: ['normativa', 'extra'],
    urlNormattiva: r.urlNormattiva,
    gazzettaUfficiale: ''
  })), null, 2) + ';';
  
  fs.writeFileSync('server/seed-extra.ts', code);
  console.log('Done! Saved to server/seed-extra.ts');
}

main();
