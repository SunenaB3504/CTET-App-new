import { beforeEach, describe, it, expect, vi } from 'vitest'
import { getQuestionById } from '../../lib/ctetDataLoader'

// Helper to mock global.fetch
function mockFetch(responses: Record<string, any>){
  global.fetch = vi.fn((input: RequestInfo) => {
    const url = String(input)
    const key = Object.keys(responses).find(k => url.endsWith(k))
    if(!key) return Promise.resolve(new Response(null, { status: 404 }))
    const body = JSON.stringify(responses[key])
    return Promise.resolve(new Response(body, { status: 200, headers: { 'Content-Type': 'application/json' } }))
  }) as any
}

describe('ctetDataLoader.getQuestionById', ()=>{
  beforeEach(()=>{
    vi.resetModules()
    vi.restoreAllMocks()
  })

  it('returns the question from indexed manifest when present', async ()=>{
    const manifest = {
      generatedAt: 'now',
      files: [{ output: 'data/file1.json', paper: 'Paper 1', subject: 'Maths', language: 'English', questionCount: 1 }],
      questionIndex: { 'Q1': [{ file: 'data/file1.json' }] }
    }
    const file1 = { questions: [{ id: 'Q1', question: 'Sample Q1' }] }
    mockFetch({ 'manifest-latest.json': manifest, 'data/file1.json': file1 })

    const res = await getQuestionById('Q1')
    expect(res).not.toBeNull()
    expect(res.id).toBe('Q1')
    expect(res.question).toBe('Sample Q1')
  })
})
