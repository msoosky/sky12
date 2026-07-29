import { getFinancials } from '../../../_lib/dart.js'

export async function onRequestGet() {
  try {
    const result = await getFinancials()
    return Response.json(result)
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
