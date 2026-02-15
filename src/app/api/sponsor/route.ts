import { NextRequest, NextResponse } from 'next/server'
import { privateKeyToAccount } from 'viem/accounts'
import { TransactionEnvelopeTempo } from 'tempo.ts/ox'
import type { Address, Hex } from 'viem'

export async function POST(request: NextRequest) {
  try {
    const { serializedTx } = await request.json()

    // 1. Extract sender from magic bytes suffix: [address 20B][0xfeefeefeefee 6B]
    const hex = serializedTx as string
    if (!hex.endsWith('feefeefeefee')) {
      return NextResponse.json({ error: 'Missing magic bytes' }, { status: 400 })
    }
    const sender = ('0x' + hex.slice(-52, -12)) as Address
    const rawTx = hex.slice(0, -52) as `0x76${string}`

    // 2. Deserialize — returns envelope with user's signature + feePayerSignature: null
    const envelope = TransactionEnvelopeTempo.deserialize(rawTx)

    // 3. Compute fee payer sign payload (keccak256 of tx serialized in 'feePayer' format)
    const hash = TransactionEnvelopeTempo.getFeePayerSignPayload(envelope, { sender })

    // 4. Fee payer signs the hash
    const feePayerAccount = privateKeyToAccount(process.env.FEE_PAYER_PRIVATE_KEY as Hex)
    const rawSig = await feePayerAccount.sign({ hash })
    const feePayerSignature = parseRawSignature(rawSig)

    // 5. Re-serialize with BOTH signatures (user's original + fee payer's new)
    const cosignedTx = TransactionEnvelopeTempo.serialize(envelope, {
      signature: envelope.signature,
      feePayerSignature,
    })

    // 6. Broadcast via raw JSON-RPC
    const rpcResponse = await fetch('https://rpc.moderato.tempo.xyz', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_sendRawTransaction',
        params: [cosignedTx],
        id: 1,
      }),
    })
    const rpcResult = await rpcResponse.json()
    if (rpcResult.error) {
      return NextResponse.json({ error: rpcResult.error.message }, { status: 500 })
    }
    return NextResponse.json({ hash: rpcResult.result })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Sponsor error'
    console.error('Sponsor error:', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// Parse 65-byte hex signature into { r, s, yParity } for Tempo's Signature type
function parseRawSignature(sig: Hex): { r: bigint; s: bigint; yParity: 0 | 1 } {
  const r = BigInt(('0x' + sig.slice(2, 66)) as Hex)
  const s = BigInt(('0x' + sig.slice(66, 130)) as Hex)
  const v = parseInt(sig.slice(130, 132), 16)
  return { r, s, yParity: (v === 27 || v === 0 ? 0 : 1) as 0 | 1 }
}
