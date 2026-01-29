import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'

// Load env from .claude/.env
dotenv.config({ path: path.join(__dirname, '../.claude/.env') })

const SUPABASE_URL = process.env.SUPABASE_URL!
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_API_KEY!

const supabase = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY)

interface EmployeeSample {
  email: string
  example_post_1: string
  example_post_2: string
  example_post_3: string
  blurb: string
  is_sample: boolean
}

function parseCSV(content: string): EmployeeSample[] {
  const lines = content.trim().split('\n')
  const headers = parseCSVLine(lines[0])

  return lines.slice(1).map(line => {
    const values = parseCSVLine(line)
    return {
      email: values[0],
      example_post_1: values[1],
      example_post_2: values[2],
      example_post_3: values[3],
      blurb: values[4],
      is_sample: values[5] === 'true'
    }
  })
}

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += char
    }
  }
  result.push(current)
  return result
}

async function createTable() {
  const { error } = await supabase.rpc('exec_sql', {
    sql: `
      CREATE TABLE IF NOT EXISTS employee_voice_samples (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        example_post_1 TEXT NOT NULL,
        example_post_2 TEXT NOT NULL,
        example_post_3 TEXT NOT NULL,
        blurb TEXT NOT NULL,
        is_sample BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `
  })

  if (error) {
    console.log('Note: Table may already exist or RPC not available. Proceeding with insert...')
  }
}

async function seedData() {
  const csvPath = path.join(__dirname, '../data/sample_employee_posts.csv')
  const csvContent = fs.readFileSync(csvPath, 'utf-8')
  const samples = parseCSV(csvContent)

  console.log(`Parsed ${samples.length} employee samples`)

  // Upsert each sample
  for (const sample of samples) {
    const { data, error } = await supabase
      .from('employee_voice_samples')
      .upsert(
        {
          email: sample.email,
          example_post_1: sample.example_post_1,
          example_post_2: sample.example_post_2,
          example_post_3: sample.example_post_3,
          blurb: sample.blurb,
          is_sample: sample.is_sample,
          updated_at: new Date().toISOString()
        },
        { onConflict: 'email' }
      )
      .select()

    if (error) {
      console.error(`Error inserting ${sample.email}:`, error.message)
    } else {
      console.log(`✓ Upserted: ${sample.email}`)
    }
  }

  console.log('\nSeeding complete!')
}

async function main() {
  console.log('Starting employee voice samples seed...\n')
  await createTable()
  await seedData()
}

main().catch(console.error)
