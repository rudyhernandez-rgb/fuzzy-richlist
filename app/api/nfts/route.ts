import { NextResponse } from 'next/server'

const FUZZYBEARS_ISSUER = 'rw1R8cfHGMySmbj7gJ1HkiCqTY1xhLGYAs'
const FUZZYBEARS_TAXON = '1'
const XRPLTO_SLUG = 'fuzzybears'
const IPFS_GATEWAY = 'https://cloudflare-ipfs.com/ipfs/'

let cache: { data: any, timestamp: number } | null = null
const CACHE_DURATION = 5 * 60 * 1000

function ipfsToHttp(uri: string): string {
  if (!uri) return ''
  if (uri.startsWith('ipfs://')) return IPFS_GATEWAY + uri.slice(7)
  if (uri.includes('ipfs.io/ipfs/')) return uri.replace('https://ipfs.io/ipfs/', IPFS_GATEWAY)
  return uri
}

export async function GET() {
  try {
    const now = Date.now()
    if (cache && (now - cache.timestamp) < CACHE_DURATION) {
      return NextResponse.json(cache.data)
    }

    const bithompHeaders = { 'x-bithomp-token': process.env.BITHOMP_API_KEY || '' }

    const [xrpltoRes, salesRes] = await Promise.all([
      fetch(`https://api.xrpl.to/v1/nft/collections/${XRPLTO_SLUG}`),
      fetch(
        `https://bithomp.com/api/v2/nft-sales?issuer=${FUZZYBEARS_ISSUER}&taxon=${FUZZYBEARS_TAXON}&limit=10`,
        { headers: bithompHeaders }
      )
    ])

    const xrpltoData = await xrpltoRes.json()
    const salesData = await salesRes.json()

    const col = xrpltoData?.collection || xrpltoData || {}

    const floorXrp = col?.floorPrice || col?.floor || col?.floor_price || null
    const totalNfts = col?.supply || col?.totalNfts || col?.nftsCount || 3210
    const totalOwners = col?.owners || col?.totalOwners || col?.ownersCount || 640
    const totalVolume = col?.totalVolume || col?.volume || col?.vol || null
    const listed = col?.listed || col?.listedPct || null

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
      _debug: { xrpltoKeys: Object.keys(col), xrpltoSample: col }
    }

    cache = { data: result, timestamp: now }
    return NextResponse.json(result)

  } catch (error) {
    console.error('NFT API error:', error)
    return NextResponse.json({ error: 'Failed to fetch NFT data' }, { status: 500 })
  }
}