import { NextRequest, NextResponse } from 'next/server'
import { createClient, http } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { signTransaction } from 'viem/actions'
import { Chain, Transaction, tempoActions } from 'tempo.ts/viem'
import { pathUsd } from '@/constants'

const tempoModerato = Chain.define({
  id: 42431,
  name: 'Tempo Moderato',
  nativeCurrency: { name: 'pathUSD', symbol: 'pathUSD', decimals: 6 },
  rpcUrls: { default: { http: ['https://rpc.moderato.tempo.xyz'] } },
  feeToken: pathUsd,
})()

function getClient() {
  const feePayerAccount = privateKeyToAccount(process.env.FEE_PAYER_PRIVATE_KEY as `0x${string}`)
  const client = createClient({
    chain: tempoModerato,
    transport: http('https://rpc.moderato.tempo.xyz'),
    account: feePayerAccount,
  }).extend(tempoActions())
  return { client, feePayerAccount }
}

export async function POST(request: NextRequest) {
  try {
    const { serializedTx } = await request.json()
    const { client, feePayerAccount } = getClient()

    // Deserialize user-signed tx (extracts sender from 0xfeefeefeefee magic suffix)
    const transaction = Transaction.deserialize(serializedTx)

    // Co-sign with fee payer account
    // @ts-expect-error — Transaction.deserialize returns eip1559 type but
    // the Tempo chain serializer handles it correctly at runtime (matches SDK Handler.ts)
    const cosignedTx = await signTransaction(client, {
      ...transaction,
      account: feePayerAccount,
      feePayer: feePayerAccount,
    })

    // Broadcast to Tempo RPC
    const hash = await client.request({
      method: 'eth_sendRawTransaction',
      params: [cosignedTx],
    })

    return NextResponse.json({ hash })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Sponsor error'
    console.error('Sponsor error:', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
