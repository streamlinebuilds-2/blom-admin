import { createClient } from '@supabase/supabase-js'

export function guardClientWrites(client: ReturnType<typeof createClient>) {
  const origFrom = client.from.bind(client) as any
  ;(client as any).from = ((table: string) => {
    const q = origFrom(table)
    const err = new Error(`Client write blocked for table: ${table}. Use /.netlify/functions/save-product instead.`)
    ;(['insert','upsert','update','delete'] as const).forEach((m) => {
      const orig = (q as any)[m]?.bind(q)
      ;(q as any)[m] = (..._args: any[]) => { throw err }
      // keep select/rpc untouched
    })
    return q
  }) as any
  return client
}

