import { NextRequest, NextResponse } from 'next/server'
import { readFileSync } from 'fs'
import { join } from 'path'
import PizZip from 'pizzip'
import Docxtemplater from 'docxtemplater'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const vars: Record<string, string> = await req.json()

    const templatePath = join(process.cwd(), 'templates', 'nda.docx')
    const content = readFileSync(templatePath, 'binary')

    const zip = new PizZip(content)
    const doc = new Docxtemplater(zip, {
      delimiters: { start: '{{', end: '}}' },
      paragraphLoop: true,
      linebreaks: true,
    })

    doc.render(vars)

    const out: Uint8Array = doc.getZip().generate({ type: 'uint8array', compression: 'DEFLATE' })

    const clientName = (vars.CLIENT_LEGAL_NAME || 'Client').replace(/[^a-zA-Z0-9_-]/g, '_')

    return new NextResponse(out.buffer as ArrayBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="NDA_${clientName}.docx"`,
      },
    })
  } catch (err) {
    console.error('NDA generation error:', err)
    return NextResponse.json({ error: 'Failed to generate NDA' }, { status: 500 })
  }
}
