import fs from 'node:fs/promises'
import { resolve } from 'node:path'
import pg from 'pg'
import { legacyMenuImage } from './legacy-menu-images.mjs'

const apply = process.argv.includes('--apply')
const env = await fs.readFile(resolve('.env.local'), 'utf8')
const connectionString = process.env.DATABASE_URL || env.match(/^DATABASE_URL=(.*)$/m)?.[1]?.trim()
if (!connectionString) throw new Error('Falta DATABASE_URL en .env.local')

const client = new pg.Client({ connectionString })
await client.connect()
try {
  const result = await client.query(`SELECT id, data->>'name' AS name, data->>'image' AS image,
      data->'legacy'->>'itemId' AS item_id, data->'legacy'->>'originalVariation' AS variation,
      data->>'imageSource' AS image_source
    FROM products WHERE data->'legacy'->>'branchId' = '1'
    ORDER BY id`)
  const missingMapping = []
  const missingFiles = new Set()
  const changes = []
  const preserved = []

  for (const row of result.rows) {
    const path = legacyMenuImage(row.item_id, row.variation)
    if (!path) { missingMapping.push(`${row.item_id}: ${row.name}`); continue }
    try { await fs.access(resolve('public', path.slice(1))) }
    catch { missingFiles.add(path) }
    if (row.image === path) continue
    if (row.image && row.image !== '/placeholder.svg' && !['illustrative-generated', 'illustrative-web'].includes(row.image_source)) {
      preserved.push(row.name)
      continue
    }
    changes.push({ id: row.id, name: row.name, before: row.image, after: path })
  }

  const summary = {
    mode: apply ? 'apply' : 'preview',
    importedProducts: result.rows.length,
    toUpdate: changes.length,
    alreadyCorrect: result.rows.length - changes.length - preserved.length - missingMapping.length,
    customImagesPreserved: preserved.length,
    missingMapping,
    missingFiles: [...missingFiles],
  }
  if (missingMapping.length || missingFiles.size) {
    console.log(JSON.stringify(summary, null, 2))
    process.exitCode = 1
  } else if (apply) {
    await fs.mkdir(resolve('artifacts'), { recursive: true })
    const backup = resolve('artifacts', `menu-images-before-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
    await fs.writeFile(backup, JSON.stringify(changes.map(({ id, name, before }) => ({ id, name, image: before })), null, 2))
    await client.query('BEGIN')
    try {
      for (const change of changes) {
        await client.query(`UPDATE products SET data = jsonb_set(
            jsonb_set(data, '{image}', to_jsonb($1::text), true),
            '{imageSource}', to_jsonb('illustrative-web'::text), true), updated_at = NOW()
          WHERE id = $2`, [change.after, change.id])
      }
      await client.query('COMMIT')
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    }
    console.log(JSON.stringify({ ...summary, backup }, null, 2))
  } else console.log(JSON.stringify(summary, null, 2))
} finally {
  await client.end()
}
