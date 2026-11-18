import fs from 'node:fs/promises'
import { resolve } from 'node:path'

// Search terms for reusable restaurant photos. Results are reviewed before download.
export const queries = {
  empanadas: 'empanadas food', pizza: 'margherita pizza', carbonara: 'spaghetti carbonara',
  pesto: 'spaghetti pesto', 'spaghetti-bolognese': 'spaghetti bolognese',
  ravioli: 'ravioli pasta', alfredo: 'fettuccine alfredo', gnocchi: 'gnocchi pasta',
  lasagna: 'lasagna food', 'arroz-leche': 'rice pudding cinnamon', crema: 'creme brulee',
  'tres-leches': 'tres leches cake', jugo: 'orange juice glass', delivery: 'food delivery bag',
  tarta: 'savory vegetable pie', milanesa: 'milanesa', omelette: 'omelette food',
  guiso: 'beef stew', cerdo: 'pork chop food', 'pollo-grille': 'grilled chicken breast plate',
  strogonoff: 'beef stroganoff', yakisoba: 'yakisoba noodles', puchero: 'puchero beef soup',
  'vori-vori': 'vori vori paraguay', vino: 'red wine glass', cola: 'cola glass',
  salad: 'green salad bowl', sandwich: 'steak sandwich', cocido: 'hot tea cup',
  bife: 'beef steak plate', salsa: 'tomato pasta sauce', polenta: 'polenta beef sauce',
  feijoada: 'feijoada', soyo: 'paraguayan soyo soup', albondigas: 'meatballs tomato sauce',
  burger: 'beef burger food', 'pastelon-papa': 'shepherds pie', asado: 'barbecue beef ribs',
  'tortilla-soo': 'beef omelette', arroz: 'white rice bowl', wings: 'chicken wings food',
  fries: 'french fries food', water: 'water bottle', pan: 'bread rolls basket',
  beer: 'beer glass bottle', risotto: 'pumpkin risotto', 'pollo-curry': 'chicken curry rice',
  locro: 'locro stew', 'lomo-cerdo-mostaza': 'filet mignon moutarde',
  'empanadas-pollo': 'chicken empanadas', 'empanadas-queso': 'cheese empanadas',
  'milanesa-pollo': 'chicken milanesa', 'strogonoff-pollo': 'chicken stroganoff',
  'yakisoba-pollo': 'chicken yakisoba', 'ensalada-cesar': 'caesar salad chicken',
  pure: 'mashed potatoes bowl',
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname.replace(/^\/(?:[A-Za-z]:)/, (match) => match.slice(1)))) {
  const entries = Object.entries(queries)
  const results = {}
  let next = 0
  async function worker() {
    while (next < entries.length) {
      const [slug, query] = entries[next++]
      const url = new URL('https://api.openverse.org/v1/images/')
      url.searchParams.set('q', query)
      url.searchParams.set('license', 'cc0,pdm,by,by-sa')
      url.searchParams.set('page_size', '20')
      const response = await fetch(url, { headers: { 'User-Agent': 'CNID-POS/1.0 (restaurant menu photo curation)' } })
      if (!response.ok) throw new Error(`${slug}: ${response.status}`)
      const data = await response.json()
      results[slug] = (data.results ?? []).map((item) => ({
        title: item.title, creator: item.creator, license: item.license, licenseUrl: item.license_url,
        source: item.source, page: item.foreign_landing_url, url: item.url,
        width: item.width, height: item.height,
      }))
      console.log(`${slug}: ${results[slug].length} resultados`)
    }
  }
  await Promise.all([worker(), worker(), worker()])
  await fs.mkdir(resolve('artifacts'), { recursive: true })
  await fs.writeFile(resolve('artifacts/menu-photo-search.json'), JSON.stringify(results, null, 2))
}
