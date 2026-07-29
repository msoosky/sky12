import { getChartRange, EARLIEST_CHART_YEAR } from '../../../_lib/naver.js'

export async function onRequestGet({ request, params }) {
  const url = new URL(request.url)
  const startYear = Number(url.searchParams.get('startYear')) || EARLIEST_CHART_YEAR
  const endYear = Number(url.searchParams.get('endYear')) || new Date().getFullYear()

  try {
    const result = await getChartRange(params.stockCode, startYear, endYear)
    return Response.json(result)
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
