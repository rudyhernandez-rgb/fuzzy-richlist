import { NextResponse } from 'next/server'

const FUZZYBEARS_ISSUER = 'rw1R8cfHGMySmbj7gJ1HkiCqTY1xhLGYAs'
const FUZZYBEARS_TAXON = '1'
const XRPLTO_SLUG = 'fuzzybears'
const IPFS_GATEWAY = 'https://gateway.pinata.cloud/ipfs/'

let cache: { data: any, timestamp: number } | null = null
const CACHE_DURATION = 5 * 60 * 1000

function ipfsToHttp(uri: string): string {
  if (!uri) return ''
  let path = uri
  if (path.startsWith('ipfs://')) path = path.slice(7)
  else {
    const ipfsMatch = path.match(/\/ipfs\/(.+)/)
    if (ipfsMatch) path = ipfsMatch[1]
  }
  return IPFS_GATEWAY + path.replace(/#/g, '%23')
}

export async function GET() {
  try {
    const now = Date.now()
    if (cache && (now - cache.timestamp) < CACHE_DURATION) {
      return NextResponse.json(cache.data)
    }

    const bithompHeaders = { 'x-bithomp-token': process.env.BITHOMP_API_KEY || '' }

    const [xrpltoRes, salesRes] = await Promise.all([
      fetch(`https://api.xrpl.to/v1/nft/collections/${XRPLTO_SLUG}`, {
        headers: { 'Accept': 'application/json' }
      }),
      fetch(
        `https://bithomp.com/api/v2/nft-sales?issuer=${FUZZYBEARS_ISSUER}&taxon=${FUZZYBEARS_TAXON}&limit=10`,
        { headers: bithompHeaders }
      )
    ])

    const col = await xrpltoRes.json()
    const salesData = await salesRes.json()

    const floorXrp = col?.floor || null
    const totalNfts = col?.items || 3211
    const totalOwners = col?.owners || 642
    const totalVolume = col?.totalVolume || null
    const listedCount = col?.listedCount || 0
    const listed = listedCount && totalNfts
      ? parseFloat(((listedCount / totalNfts) * 100).toFixed(1))
      : null

    const sales = (salesData?.sales || []).map((sale: any) => {
      const nftoken = sale?.nftoken || {}
      const meta = nftoken?.metadata || {}
      const rawImage = meta?.image || nftoken?.url || ''
      const image = ipfsToHttp(rawImage)
      const name = meta?.name || 'Fuzzybear'
      const amountDrops = sale?.amount ? parseInt(sale.amount) : null
      const amountXrp = amountDrops ? amountDrops / 1_000_000 : null
      const soldAtRaw = sale?.soldAt || sale?.acceptedAt || null
      const soldAt = soldAtRaw ? new Date(soldAtRaw * 1000).toISOString() : ''

      return {
        nftokenID: sale.nftokenID,
        name,
        image,
        amountXrp,
        seller: sale.seller || '',
        buyer: sale.buyer || '',
        soldAt,
        marketplace: sale.marketplace || '',
      }
    })

    const result = {
      floorXrp,
      totalNfts,
      totalOwners,
      totalVolume,
      listed,
      sales,
      vol24h: col?.vol24h || null,
      sales24h: col?.sales24h || null,
      totalSales: col?.totalSales || null,
      marketcap: col?.marketcap?.amount || null,
      topOffer: col?.topOffer?.amount || null,
      floor1dPercent: col?.floor1dPercent || null,
      floor7dPercent: col?.floor7dPercent || null,
      floor30dPercent: col?.floor30dPercent || null,
      floor24hAgo: col?.floor24hAgo || null,
      floor7dAgo: col?.floor7dAgo || null,
      floor30dAgo: col?.floor30dAgo || null,
    }

    cache = { data: result, timestamp: now }
    return NextResponse.json(result)

  } catch (error) {
    console.error('NFT API error:', error)
    return NextResponse.json({ error: 'Failed to fetch NFT data' }, { status: 500 })
  }
}