import { searchCompanies } from '../_lib/dart.js'

export async function onRequestGet({ request }) {
  const url = new URL(request.url)
  const q = url.searchParams.get('q') || ''
  if (!q.trim()) return Response.json([])

  try {
    const result = await searchCompanies(q)
    return Response.json(result)
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
