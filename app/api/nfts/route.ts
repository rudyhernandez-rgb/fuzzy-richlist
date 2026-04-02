import { NextResponse } from 'next/server'

const FUZZYBEARS_ISSUER = 'rw1R8cfHGMySmbj7gJ1HkiCqTY1xhLGYAs'
const FUZZYBEARS_TAXON = '1'
const IPFS_GATEWAY = 'https://ipfs.io/ipfs/'

let cache: { data: any, timestamp: number } | null = null
const CACHE_DURATION = 5 * 60 * 1000

function ipfsToHttp(uri: string): string {
  if (!uri) return ''
  if (uri.startsWith('ipfs://')) {
    return IPFS_GATEWAY + uri.slice(7)
  }
  return uri
}

export async function GET() {
  try {
    const now = Date.now()
    if (cache && (now - cache.timestamp) < CACHE_DURATION) {
      return NextResponse.json(cache.data)
    }

    const headers = { 'x-bithomp-token': process.env.BITHOMP_API_KEY || '' }

    const [collectionRes, salesRes] = await Promise.all([
      fetch(
        `https://bithomp.com/api/v2/nft-collection/${FUZZYBEARS_ISSUER}:${FUZZYBEARS_TAXON}?floorPrice=true&statistics=true`,
        { headers }
      ),
      fetch(
        `https://bithomp.com/api/v2/nft-sales?issuer=${FUZZYBEARS_ISSUER}&taxon=${FUZZYBEARS_TAXON}&list=last&limit=10&sale=secondary`,
        { headers }
      )
    ])

    const collectionData = await collectionRes.json()
    const salesData = await salesRes.json()

    const collection = collectionData?.collection || {}
    const statistics = collectionData?.statistics || {}
    const floorPrices = collection?.floorPrices || []
    const floorXrp = floorPrices?.[0]?.open?.amount
      ? parseInt(floorPrices[0].open.amount) / 1_000_000
      : null

    const sales = (salesData?.sales || []).map((sale: any) => {
      const meta = sale?.nftoken?.metadata || {}
      const rawImage = meta?.image || ''
      const image = ipfsToHttp(rawImage)
      const name = meta?.name || 'Fuzzybear'
      const amountDrops = typeof sale.amount === 'string'
        ? parseInt(sale.amount)
        : null
      const amountXrp = amountDrops ? amountDrops / 1_000_000 : null

      return {
        nftokenID: sale.nftokenID,
        name,
        image,
        amountXrp,
        seller: sale.seller || '',
        buyer: sale.buyer || '',
        soldAt: sale.soldAt || '',
        marketplace: sale.marketplace || '',
      }
    })

    const result = {
      floorXrp,
      totalNfts: statistics?.totalNfts || collection?.totalNfts || 3210,
      totalOwners: statistics?.totalOwners || collection?.totalOwners || 640,
      totalVolume: statistics?.volumeXrp || null,
      listed: statistics?.listed || null,
      sales,
    }

    cache = { data: result, timestamp: now }
    return NextResponse.json(result)

  } catch (error) {
    console.error('NFT API error:', error)
    return NextResponse.json({ error: 'Failed to fetch NFT data' }, { status: 500 })
  }
}