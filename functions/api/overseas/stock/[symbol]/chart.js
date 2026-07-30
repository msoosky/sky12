import { getOverseasChart } from '../../../../_lib/overseas.js'

export async function onRequestGet({ params }) {
  try {
    const result = await getOverseasChart(params.symbol)
    return Response.json(result)
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
