const queries = {
  pizza: 'pizza', empanadas: 'empanada', milanesa: 'schnitzel',
  bife: 'beef steak', asado: 'beef ribs', pesto: 'pasta pesto',
  'pollo-grille': 'grilled chicken', tarta: 'savory pie',
  carbonara: 'carbonara pasta', fries: 'french fries',
  lasagna: 'lasagna', guiso: 'beef stew',
  'spaghetti-bolognese': 'spaghetti bolognese', ravioli: 'ravioli',
  gnocchi: 'gnocchi', delivery: 'food delivery',
  'asado-2': 'grilled meat', 'asado-3': 'barbecue',
  'milanesa-2': 'breaded chicken', 'milanesa-3': 'fried chicken cutlet',
  'pesto-2': 'pesto', 'tarta-2': 'pie', 'delivery-2': 'takeaway food',
  'delivery-3': 'food package', 'delivery-4': 'paper food bag',
}

for (const [slug, query] of Object.entries(queries)) {
  if (process.argv.includes('--additional') && !/-[234]$/.test(slug)) continue
  if (process.argv.includes('--delivery') && !slug.startsWith('delivery-')) continue
  const url = new URL('https://api.openverse.org/v1/images/')
  url.searchParams.set('q', query)
  url.searchParams.set('source', 'wordpress')
  url.searchParams.set('page_size', '8')
  try {
    const response = await fetch(url, { headers: { 'User-Agent': 'CNID-POS/1.0' } })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const result = await response.json()
    console.log(JSON.stringify({ slug, query, results: result.results.map(({ title, url, license, foreign_landing_url, width, height }) => ({ title, url, license, page: foreign_landing_url, width, height })) }))
  } catch (error) { console.log(JSON.stringify({ slug, error: String(error) })) }
}
