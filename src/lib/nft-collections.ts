export interface NftCollection {
  contract: string
  name: string
}

export function toSlug(name: string): string {
  return name.toLowerCase().replace(/ /g, '-')
}

export const NFT_COLLECTIONS: NftCollection[] = [
  { contract: '0xb47e3cd837ddf8e4c57f05d70ab865de6e193bbb', name: 'CryptoPunks' },
  { contract: '0xbc4ca0eda7647a8ab7c2061c2e118a18a936f13d', name: 'Bored Ape Yacht Club' },
  { contract: '0xbd3531da5cf5857e7cfaa92426877b022e612cf8', name: 'Pudgy Penguins' },
  { contract: '0x5af0d9827e0c53e4799bb226655a1de152a425a5', name: 'Milady Maker' },
  { contract: '0xed5af388653567af2f388e6224dc7c4b3241c544', name: 'Azuki' },
  { contract: '0x9c8ff314c9bc7f6e59a9d9225fb22946427edc03', name: 'Nouns' },
  { contract: '0x8a90cab2b38dba80c64b7734e58ee1db38b8992e', name: 'Doodles' },
  { contract: '0x79fcdef22feed20eddacbb2587640e45491b757f', name: 'mfers' },
  { contract: '0x9125e2d6827a00b0f8330d6ef7bef07730bac685', name: 'Hypurr' },
]

export function getCollectionBySlug(slug: string): NftCollection | undefined {
  return NFT_COLLECTIONS.find((c) => toSlug(c.name) === slug)
}
