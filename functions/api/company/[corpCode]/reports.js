import { getReports } from '../../../_lib/dart.js'

export async function onRequestGet({ params }) {
  try {
    const result = await getReports(params.corpCode)
    return Response.json(result)
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
