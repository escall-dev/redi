/**
 * Lightweight Zero-Dependency QR Code Generator (Model 2, Byte Mode)
 * Produces clean SVG representation of URLs without external npm dependencies.
 */

// GF(256) math tables
const EXP_TABLE = new Uint8Array(256)
const LOG_TABLE = new Uint8Array(256)

;(function initGaloisField() {
  let val = 1
  for (let i = 0; i < 255; i++) {
    EXP_TABLE[i] = val
    LOG_TABLE[val] = i
    val = (val << 1) ^ (val & 0x80 ? 0x11d : 0)
  }
  EXP_TABLE[255] = EXP_TABLE[0]
})()

function gMultiply(a: number, b: number): number {
  if (a === 0 || b === 0) return 0
  return EXP_TABLE[(LOG_TABLE[a] + LOG_TABLE[b]) % 255]
}

// Generate Reed-Solomon generator polynomial
function getGeneratorPoly(degree: number): Uint8Array {
  let poly = new Uint8Array([1])
  for (let i = 0; i < degree; i++) {
    const nextPoly = new Uint8Array(poly.length + 1)
    const factor = EXP_TABLE[i]
    for (let j = 0; j < poly.length; j++) {
      nextPoly[j] ^= gMultiply(poly[j], factor)
      nextPoly[j + 1] ^= poly[j]
    }
    poly = nextPoly
  }
  return poly
}

// Calculate ECC codewords
function calculateEcc(data: Uint8Array, eccCount: number): Uint8Array {
  const gen = getGeneratorPoly(eccCount)
  const result = new Uint8Array(data.length + eccCount)
  result.set(data)

  for (let i = 0; i < data.length; i++) {
    const coef = result[i]
    if (coef !== 0) {
      for (let j = 0; j < gen.length; j++) {
        result[i + j] ^= gMultiply(gen[j], coef)
      }
    }
  }
  return result.slice(data.length)
}

// Version table parameters: [version, totalCodewords, dataCodewords, eccCount] (Level L)
const VERSION_PARAMS = [
  [1, 26, 19, 7],
  [2, 44, 34, 10],
  [3, 70, 55, 15],
  [4, 100, 80, 20],
  [5, 134, 108, 26],
  [6, 172, 136, 18], // 2 blocks
]

// Alignment pattern centers per version
const ALIGNMENT_CENTERS: Record<number, number[]> = {
  2: [6, 18],
  3: [6, 22],
  4: [6, 26],
  5: [6, 30],
  6: [6, 34],
}

export function generateQrMatrix(text: string): boolean[][] {
  const utf8Bytes = new TextEncoder().encode(text)

  // Pick smallest fitting version
  let version = 1
  let dataLimit = 19
  let eccCount = 7
  let totalCodewords = 26

  for (const [v, total, data, ecc] of VERSION_PARAMS) {
    // Byte mode overhead: 4 bits mode + 8/16 bits char count
    const headerBits = 4 + (v <= 9 ? 8 : 16)
    const maxBytes = Math.floor((data * 8 - headerBits) / 8)
    if (utf8Bytes.length <= maxBytes) {
      version = v
      totalCodewords = total
      dataLimit = data
      eccCount = ecc
      break
    }
  }

  // Encode data into bits
  const bitArray: number[] = []
  const pushBits = (val: number, length: number) => {
    for (let i = length - 1; i >= 0; i--) {
      bitArray.push((val >> i) & 1)
    }
  }

  // Mode: 8-bit byte = 0100
  pushBits(0b0100, 4)
  // Character count
  pushBits(utf8Bytes.length, version <= 9 ? 8 : 16)
  // Data bytes
  for (const b of utf8Bytes) {
    pushBits(b, 8)
  }

  // Terminator (up to 4 zeroes)
  const remainingSpace = dataLimit * 8 - bitArray.length
  const terminatorLength = Math.min(4, Math.max(0, remainingSpace))
  pushBits(0, terminatorLength)

  // Pad to multiple of 8
  while (bitArray.length % 8 !== 0) {
    bitArray.push(0)
  }

  // Pad with alternating 11101100 (0xEC) and 00010001 (0x11)
  const padBytes = [0xec, 0x11]
  let padIndex = 0
  while (bitArray.length < dataLimit * 8) {
    pushBits(padBytes[padIndex % 2], 8)
    padIndex++
  }

  // Convert bits to byte codewords
  const dataCodewords = new Uint8Array(dataLimit)
  for (let i = 0; i < dataLimit; i++) {
    let byteVal = 0
    for (let b = 0; b < 8; b++) {
      byteVal = (byteVal << 1) | bitArray[i * 8 + b]
    }
    dataCodewords[i] = byteVal
  }

  // Calculate ECC
  const eccCodewords = calculateEcc(dataCodewords, eccCount)

  // Interleave / combine codewords
  const finalCodewords = new Uint8Array(totalCodewords)
  finalCodewords.set(dataCodewords, 0)
  finalCodewords.set(eccCodewords, dataLimit)

  // Size of matrix: (version - 1) * 4 + 21
  const size = (version - 1) * 4 + 21
  const matrix: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false))
  const isReserved: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false))

  // Draw 7x7 Finder Pattern with 1px border
  const drawFinder = (startX: number, startY: number) => {
    for (let dy = -1; dy <= 7; dy++) {
      for (let dx = -1; dx <= 7; dx++) {
        const x = startX + dx
        const y = startY + dy
        if (x >= 0 && x < size && y >= 0 && y < size) {
          isReserved[y][x] = true
          if (dx >= 0 && dx <= 6 && dy >= 0 && dy <= 6) {
            const isBorder = dx === 0 || dx === 6 || dy === 0 || dy === 6
            const isCore = dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4
            matrix[y][x] = isBorder || isCore
          } else {
            matrix[y][x] = false
          }
        }
      }
    }
  }

  drawFinder(0, 0)
  drawFinder(size - 7, 0)
  drawFinder(0, size - 7)

  // Alignment patterns
  if (ALIGNMENT_CENTERS[version]) {
    const centers = ALIGNMENT_CENTERS[version]
    for (const cy of centers) {
      for (const cx of centers) {
        // Skip finders
        if ((cx <= 8 && cy <= 8) || (cx >= size - 8 && cy <= 8) || (cx <= 8 && cy >= size - 8)) {
          continue
        }
        for (let dy = -2; dy <= 2; dy++) {
          for (let dx = -2; dx <= 2; dx++) {
            const x = cx + dx
            const y = cy + dy
            isReserved[y][x] = true
            matrix[y][x] = Math.max(Math.abs(dx), Math.abs(dy)) !== 1
          }
        }
      }
    }
  }

  // Timing patterns
  for (let i = 8; i < size - 8; i++) {
    isReserved[6][i] = true
    matrix[6][i] = i % 2 === 0
    isReserved[i][6] = true
    matrix[i][6] = i % 2 === 0
  }

  // Dark module
  isReserved[4 * version + 9][8] = true
  matrix[4 * version + 9][8] = true

  // Format info area reservation
  for (let i = 0; i <= 8; i++) {
    if (i !== 6) {
      isReserved[8][i] = true
      isReserved[i][8] = true
    }
  }
  for (let i = 0; i < 8; i++) {
    isReserved[8][size - 1 - i] = true
    isReserved[size - 1 - i][8] = true
  }

  // Format string for Error Correction L (01) + Mask 0 (000) = 01000 => format 0x77c4 with BCH
  const formatInfo = 0x77c4
  for (let i = 0; i < 15; i++) {
    const bit = ((formatInfo >> i) & 1) === 1
    // Around top-left
    if (i <= 5) {
      matrix[8][i] = bit
    } else if (i === 6) {
      matrix[8][7] = bit
    } else if (i === 7) {
      matrix[8][8] = bit
    } else if (i === 8) {
      matrix[7][8] = bit
    } else {
      matrix[14 - i][8] = bit
    }
    // Around split corners
    if (i <= 7) {
      matrix[size - 1 - i][8] = bit
    } else {
      matrix[8][size - 15 + i] = bit
    }
  }

  // Place data bits in zigzag upward/downward pattern
  let bitIdx = 0
  const totalBits = finalCodewords.length * 8
  let upward = true

  for (let rightCol = size - 1; rightCol > 0; rightCol -= 2) {
    if (rightCol === 6) rightCol-- // Skip vertical timing column

    const rows = upward
      ? Array.from({ length: size }, (_, r) => size - 1 - r)
      : Array.from({ length: size }, (_, r) => r)

    for (const r of rows) {
      for (let c = 0; c < 2; c++) {
        const col = rightCol - c
        if (!isReserved[r][col]) {
          let bit = false
          if (bitIdx < totalBits) {
            const byte = finalCodewords[Math.floor(bitIdx / 8)]
            bit = ((byte >> (7 - (bitIdx % 8))) & 1) === 1
            bitIdx++
          }
          // Mask pattern 0: (row + col) % 2 === 0
          if ((r + col) % 2 === 0) {
            bit = !bit
          }
          matrix[r][col] = bit
        }
      }
    }
    upward = !upward
  }

  return matrix
}

/**
 * Returns SVG path string representing the QR code matrix.
 */
export function generateQrSvgPath(matrix: boolean[][]): string {
  const size = matrix.length
  let path = ""
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (matrix[r][c]) {
        path += `M${c},${r}h1v1h-1z `
      }
    }
  }
  return path
}
