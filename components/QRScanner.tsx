"use client"

import { Scanner } from "@yudiel/react-qr-scanner"

interface Props {
  onScan: (data: string) => void
}

export default function QRScanner({ onScan }: Props) {
  return (
    <Scanner
      onScan={(result) => {
        if (result?.[0]) {
          onScan(result[0].rawValue)
        }
      }}
      onError={(error) => console.error(error)}
    />
  )
}