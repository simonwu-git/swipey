import { NextRequest, NextResponse } from 'next/server'
import { ParserFactory } from '@/lib/parsers/factory'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const csvContent = await file.text()
    const parser = ParserFactory.createParser(csvContent)
    const transactions = parser.parseCsv()

    return NextResponse.json({ transactions })
  } catch (error) {
    console.error('Error parsing CSV:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to parse CSV' },
      { status: 400 }
    )
  }
}
