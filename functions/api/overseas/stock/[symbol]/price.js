import { getOverseasPrice } from '../../../../_lib/overseas.js'

export async function onRequestGet({ params }) {
  try {
    const result = await getOverseasPrice(params.symbol)
    return Response.json(result)
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
