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
        `https://bithomp.com/api/v2/nft-sales?issuer=${FUZZYBEARS_ISSUER}&taxon=${FUZZYBEARS_TAXON}&limit=10`,
        { headers }
      )
    ])

    const collectionData = await collectionRes.json()
    const salesData = await salesRes.json()

    const collection = collectionData?.collection || {}
    const floorPrices = collection?.floorPrices || []

    // find the lowest open public floor price across all entries
    let floorXrp: number | null = null
    for (const fp of floorPrices) {
      const openAmount = fp?.open?.amount
      if (openAmount) {
        const xrp = parseInt(openAmount) / 1_000_000
        if (floorXrp === null || xrp < floorXrp) {
          floorXrp = xrp
        }
      }
    }

    const totalNfts = collection?.nftsCount || collection?.totalNfts || 3210
    const totalOwners = collection?.ownersCount || collection?.totalOwners || 640
    const totalVolume = collection?.volumeXrp || collection?.volume || null
    const listed = collection?.listedCount
      ? parseFloat(((collection.listedCount / totalNfts) * 100).toFixed(2))
      : null

    const sales = (salesData?.sales || []).map((sale: any) => {
      const nftoken = sale?.nftoken || {}
      const meta = nftoken?.metadata || {}
      const rawImage = meta?.image || nftoken?.url || ''
      const image = ipfsToHttp(rawImage)
      const name = meta?.name || 'Fuzzybear'
      const amountDrops = sale?.amount
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
        soldAt: sale.soldAt || sale.acceptedAt || '',
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
    }

    cache = { data: result, timestamp: now }
    return NextResponse.json(result)

  } catch (error) {
    console.error('NFT API error:', error)
    return NextResponse.json({ error: 'Failed to fetch NFT data' }, { status: 500 })
  }
}