// Cloudflare의 엣지 캐시(Cache API)를 node-cache 대용으로 쓴다. KV 네임스페이스를
// 따로 만들 필요가 없어 설정이 간단하지만, 캐시가 언제든 비워질 수 있는 "베스트 에포트"
// 캐시라서 지워지면 그냥 원본(DART/네이버)에 다시 물어보는 정도로만 취급해야 한다.
const cache = caches.default

function cacheRequest(key) {
  return new Request(`https://sky12-cache.internal/${encodeURIComponent(key)}`)
}

export async function cacheGet(key) {
  const match = await cache.match(cacheRequest(key))
  if (!match) return null
  try {
    return await match.json()
  } catch {
    return null
  }
}

export async function cachePut(key, data, ttlSeconds) {
  const res = new Response(JSON.stringify(data), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': `max-age=${ttlSeconds}`,
    },
  })
  await cache.put(cacheRequest(key), res)
}
