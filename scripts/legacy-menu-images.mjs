import { readFileSync } from 'node:fs'

// Internet-sourced, locally stored illustrations for De la Casa menu items.
// Variations of the same dish share a photo unless a more specific one exists.
const credits = JSON.parse(readFileSync(new URL('../public/menu-web/credits.json', import.meta.url), 'utf8'))
const images = new Map()

function asset(slug) {
  const path = credits[slug]?.path
  if (!path) throw new Error(`Falta foto o crédito para ${slug}`)
  return path
}

function assign(slug, itemIds) {
  for (const id of itemIds) {
    if (images.has(id)) throw new Error(`Imagen duplicada para el plato ${id}`)
    images.set(id, slug)
  }
}

assign('empanadas', [1, 64, 95])
assign('pizza', [4, 17, 18, 19, 20, 21, 75])
assign('carbonara', [7])
assign('pesto', [8])
assign('spaghetti-bolognese', [9, 50, 61])
assign('ravioli', [10, 16, 96])
assign('alfredo', [12, 13, 80])
assign('gnocchi', [14, 60])
assign('lasagna', [15, 46, 107])
assign('arroz-leche', [22])
assign('crema', [23])
assign('tres-leches', [24])
assign('jugo', [27])
assign('delivery', [30])
assign('tarta', [31, 66])
assign('milanesa', [33, 72])
assign('omelette', [35, 91])
assign('guiso', [36, 38, 49, 51, 70, 76, 93])
assign('cerdo', [37, 69, 106, 109])
assign('pollo-grille', [39, 43, 99, 104, 110, 113])
assign('strogonoff', [40])
assign('yakisoba', [41, 45])
assign('puchero', [42])
assign('vori-vori', [44, 73])
assign('vino', [52])
assign('cola', [53])
assign('salad', [54])
assign('cocido', [56])
assign('sandwich', [57, 65, 100])
assign('cocido', [58])
assign('bife', [59, 81, 111])
assign('salsa', [62])
assign('polenta', [63])
assign('feijoada', [67, 88, 89, 94])
assign('soyo', [68])
assign('albondigas', [78, 82, 85])
assign('burger', [77, 97])
assign('pastelon-papa', [83])
assign('asado', [84, 86, 101, 115])
assign('tortilla-soo', [87])
assign('arroz', [90])
assign('wings', [92])
assign('fries', [98])
assign('water', [74])
assign('pan', [102])
assign('beer', [103])
assign('risotto', [105])
assign('pollo-curry', [108])
assign('locro', [112])
assign('lomo-cerdo-mostaza', [114])

export function legacyMenuImage(itemId, variation = '') {
  const id = Number(itemId)
  const variant = String(variation ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

  if (id === 95) {
    if (variant.includes('mila')) return asset('milanesa')
    if (variant.includes('pizz')) return asset('pizza')
    if (variant.includes('sandw')) return asset('sandwich')
  }
  if (id === 1 || id === 64) {
    if (variant.includes('pollo')) return asset('empanadas-pollo')
    if (variant.includes('queso') || variant.includes('choclo')) return asset('empanadas-queso')
  }
  if (id === 33 && variant.includes('pollo')) return asset('milanesa-pollo')
  if (id === 40 && variant.includes('pollo')) return asset('strogonoff-pollo')
  if (id === 108 && !variant.includes('curry')) return asset('pollo-grille')
  if (id === 37 && variant.includes('vacuno')) return asset('bife')
  if (id === 84 && variant.includes('cerdo')) return asset('cerdo')
  if (id === 59 && variant.includes('bondiola')) return asset('cerdo')
  if (id === 45 && variant.includes('pollo')) return asset('yakisoba-pollo')
  if (id === 54 && variant.includes('cesar')) return asset('ensalada-cesar')
  if (id === 65 && variant.includes('mila')) return asset('milanesa')
  if (id === 65 && variant.includes('hambur')) return asset('burger')
  if (id === 90 && variant.includes('pure')) return asset('pure')
  if (id === 52 && variant.includes('copa')) return asset('vino')

  return images.has(id) ? asset(images.get(id)) : null
}

export function mappedLegacyItemIds() { return [...images.keys()] }
