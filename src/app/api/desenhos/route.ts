import { NextResponse } from "next/server"
import { readdir } from "node:fs/promises"
import path from "node:path"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const revalidate = 0

const EXT_REGEX = /\.(png|jpe?g|webp|gif|svg)$/i

export async function GET() {
  try {
    const baseDir = path.join(process.cwd(), "public", "desenhos")
    const entradas = await readdir(baseDir, { withFileTypes: true })

    const arquivos = entradas
      .filter((entry) => entry.isFile() && EXT_REGEX.test(entry.name))
      .map((entry) => entry.name)
      .sort((a, b) => a.localeCompare(b, "pt-BR"))

    return NextResponse.json({ arquivos })
  } catch {
    return NextResponse.json({ arquivos: [] })
  }
}
