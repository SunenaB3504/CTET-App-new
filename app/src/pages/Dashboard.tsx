import React, { useEffect, useState } from 'react'
import { listPapers, listQuestions, loadFile } from '../lib/ctetDataLoader'
import Modal from '../components/Modal'

type QuestionPreview = {
  id?: string;
  question?: string;
  options?: string[];
  attachments?: any[];
  correct_answer?: string;
  explanation?: string;
  topic?: string;
  difficulty?: string;
}

export default function Dashboard(){
  const [papers, setPapers] = useState<Array<{paper:string,count:number}>>([])
  const [loading, setLoading] = useState(true)
  const [selectedPaper, setSelectedPaper] = useState<string | null>(() => {
    try{ return localStorage.getItem('selectedPaper') }catch(e){return null}
  })
  const [questionsSummary, setQuestionsSummary] = useState<Array<any>>([])
  const [preview, setPreview] = useState<QuestionPreview | null>(null)
  const [previewFileQuestions, setPreviewFileQuestions] = useState<Array<any>>([])
  const [previewFilePath, setPreviewFilePath] = useState<string | null>(null)
  const [previewIndex, setPreviewIndex] = useState<number>(0)
  const [sampleQuestions, setSampleQuestions] = useState<Array<any>>([])
  const [explain, setExplain] = useState<any | null>(null)
  const [showPaperModal, setShowPaperModal] = useState(false)

  useEffect(()=>{
    let mounted = true
    listPapers().then(p=>{ if(mounted) setPapers(p) })
    .catch(console.error)
    .finally(()=> mounted && setLoading(false))
    return ()=>{ mounted = false }
  },[])

  // If no paper selected, default to the first available paper from manifest
  useEffect(()=>{
    if(selectedPaper) return
    if(!loading && papers && papers.length>0){
      const first = papers[0].paper
      try{ localStorage.setItem('selectedPaper', first) }catch(e){}
      setSelectedPaper(first)
    }
  },[loading, papers, selectedPaper])

  useEffect(()=>{
    if(!selectedPaper) return
    let mounted = true
    listQuestions(selectedPaper).then(list=>{
      if(!mounted) return
      setQuestionsSummary(list)
    }).catch(err=>{
      console.error('listQuestions error', err)
      setQuestionsSummary([])
    })
    return ()=>{ mounted = false }
  },[selectedPaper])

  // Load a few sample questions from the first few files for the selected paper
  useEffect(()=>{
    let mounted = true
    setSampleQuestions([])
    if(!selectedPaper) return
    (async ()=>{
      try{
        const list = await listQuestions(selectedPaper)
        // limit to first 3 files to avoid heavy loads
        const toLoad = list.slice(0,3)
        const questionsAcc: any[] = []
        for(const entry of toLoad){
          try{
            const data = await loadFile(entry.file)
            if(data && Array.isArray(data.questions)){
              // take first 3 questions as samples
              const samples = data.questions.slice(0,3).map((q:any)=> ({...q, _sourceFile: entry.file, _subject: entry.subject}))
              questionsAcc.push(...samples)
            }
          }catch(e){
            console.debug('sample load failed', entry.file, e)
          }
        }
        if(mounted) setSampleQuestions(questionsAcc)
      }catch(err){ console.error('sample questions load failed', err) }
    })()
    return ()=>{ mounted = false }
  },[selectedPaper])

  function openPaperSelector(){
    setShowPaperModal(true)
  }

  function choosePaper(p:string){
    try{ localStorage.setItem('selectedPaper', p) }catch(e){}
    setSelectedPaper(p)
    setShowPaperModal(false)
  }

  async function onPreview(filePath:string){
    try{
      const data = await loadFile(filePath)
      const questions = (data && Array.isArray(data.questions)) ? data.questions : []
      setPreviewFileQuestions(questions)
      setPreviewFilePath(filePath)
      setPreviewIndex(0)
      const q = questions && questions.length ? questions[0] : null
      setPreview(q)
    }catch(err){
      console.error('preview load failed', err)
      setPreview(null)
      setPreviewFileQuestions([])
      setPreviewFilePath(null)
      setPreviewIndex(0)
      alert('Failed to load preview')
    }
  }

  function closePreview(){
    setPreview(null)
    setPreviewFileQuestions([])
    setPreviewFilePath(null)
    setPreviewIndex(0)
  }

  async function gotoIndex(i:number){
    if(!previewFileQuestions || previewFileQuestions.length===0) return
    const clamped = Math.max(0, Math.min(i, previewFileQuestions.length-1))
    setPreviewIndex(clamped)
    setPreview(previewFileQuestions[clamped])
  }

  // move to next question; if at end of current file, attempt to open next file from questionsSummary
  async function nextQuestion(){
    if(previewFileQuestions && previewIndex < previewFileQuestions.length-1){
      gotoIndex(previewIndex+1)
      return
    }
    // find current file in questionsSummary and load the next file
    if(previewFilePath){
      const idx = questionsSummary.findIndex(q=> q.file === previewFilePath)
      if(idx>=0 && idx < questionsSummary.length-1){
        const nextFile = questionsSummary[idx+1].file
        await onPreview(nextFile)
        return
      }
    }
  }

  async function prevQuestion(){
    if(previewIndex>0){
      gotoIndex(previewIndex-1)
      return
    }
    // if at start of file, try previous file
    if(previewFilePath){
      const idx = questionsSummary.findIndex(q=> q.file === previewFilePath)
      if(idx>0){
        const prevFile = questionsSummary[idx-1].file
        await onPreview(prevFile)
        // go to last question of prev file after load
        setTimeout(()=>{
          if(previewFileQuestions && previewFileQuestions.length>0){
            gotoIndex(previewFileQuestions.length-1)
          }
        }, 300)
        return
      }
    }
  }

  // keyboard handlers for preview navigation
  useEffect(()=>{
    function onKey(e: KeyboardEvent){
      if(!preview) return
      if(e.key === 'Escape') { closePreview(); return }
      if(e.key === 'ArrowRight') { e.preventDefault(); nextQuestion(); return }
      if(e.key === 'ArrowLeft') { e.preventDefault(); prevQuestion(); return }
    }
    window.addEventListener('keydown', onKey)
    return ()=> window.removeEventListener('keydown', onKey)
  },[preview, previewIndex, previewFileQuestions, previewFilePath, questionsSummary])

  return (
    <div className="page" data-current-paper={selectedPaper}>
      <div className="container">
        <header className="dashboard-header">
          <h1 className="title">Dashboard</h1>
          <div>
            <strong>Selected Paper: </strong> {selectedPaper || '—'}
            <button className="btn" style={{marginLeft:12}} onClick={openPaperSelector} aria-label="Change selected paper">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path d="M23 7v6h-6" stroke="#0b1220" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M1 17v-6h6" stroke="#0b1220" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M23 7L15 15" stroke="#0b1220" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M1 17L9 9" stroke="#0b1220" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span style={{marginLeft:8}}>Change Paper</span>
            </button>
          </div>
        </header>
        <div aria-live="polite" className="muted" style={{marginBottom:12}}>
          {selectedPaper ? `Showing content for ${selectedPaper}` : 'No paper selected'}
        </div>

        <p className="muted">Available papers and question counts (from manifest)</p>

        {loading ? <p>Loading…</p> : (
          <div style={{marginBottom:18}}>
            <div className="paper-cards" role="list" aria-label="Available papers">
              {papers.map(p=> (
                <div key={p.paper} className="paper-card" role="listitem">
                  <div style={{fontSize:14,color:'#6b7281'}}>Paper</div>
                  <div style={{fontWeight:700,fontSize:16}}>{p.paper}</div>
                  <div style={{marginTop:8}}>{p.count} questions</div>
                  <div style={{marginTop:8}}>
                    <button className="btn outline" onClick={()=>choosePaper(p.paper)} aria-label={`Select ${p.paper}`}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                        <path d="M20 6L9 17l-5-5" stroke="#0b1220" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <span style={{marginLeft:8}}>Select</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Explain modal */}
            {explain && (
          <Modal onClose={()=>setExplain(null)} ariaLabel={`Explanation ${explain.id || ''}`}>
            <h4 style={{marginTop:0}}>Explanation — {explain.id || ''}</h4>
            <div style={{marginTop:8,fontWeight:700}}>{explain.question}</div>
            {Array.isArray(explain.options) && (
              <ol style={{marginTop:8}}>
                {explain.options.map((o:any,i:number)=>(<li key={i}>{o}</li>))}
              </ol>
            )}
            {explain.correct_answer && <div style={{marginTop:12,fontWeight:700}}>Answer: {explain.correct_answer}</div>}
            {explain.explanation && <div style={{marginTop:8}} className="muted">{explain.explanation}</div>}
            <div style={{marginTop:12}}><button className="btn outline" onClick={()=>setExplain(null)}>Close</button></div>
          </Modal>
        )}

        <section className="layout">
          <aside className="sidebar">
            <div style={{background:'#fff',padding:12,borderRadius:8,border:'1px solid #eef2ff'}}>
              <h3 style={{marginTop:0}}>My Progress</h3>
              <div>Selected Paper: <strong>{selectedPaper||'—'}</strong></div>
              <div style={{marginTop:8}}><a href="#" onClick={e=>{e.preventDefault(); openPaperSelector()}}>Change Paper</a></div>
              <div style={{marginTop:8}}>Completion: <strong>12%</strong></div>
              <div style={{marginTop:8}}>Next: Child Development — Chapter 3</div>
            </div>
          </aside>
          <main className="main-panel">
            <div style={{background:'#fff',padding:12,borderRadius:8,border:'1px solid #eef2ff'}}>
              <h2 style={{marginTop:0}}>Welcome — Demo Dashboard</h2>
              <p>Your recent tests</p>
              <div style={{display:'flex',gap:12}}>
                {selectedPaper === 'Paper 1' && (
                  <div style={{flex:1,padding:12,background:'#fbfdff',borderRadius:8,border:'1px solid #eef6ff'}}>
                    <h4>Latest Test — Paper 1</h4>
                    <div>Score: 68% • Time: 40m</div>
                    <a href="#">View Details</a>
                  </div>
                )}
                {selectedPaper === 'Paper 2' && (
                  <div style={{flex:1,padding:12,background:'#fbfdff',borderRadius:8,border:'1px solid #eef6ff'}}>
                    <h4>Latest Test — Paper 2</h4>
                    <div>Score: 54% • Time: 45m</div>
                    <a href="#">View Details</a>
                  </div>
                )}
                <div style={{flex:1,padding:12,background:'#fff',borderRadius:8,border:'1px solid #eef6ff'}}>
                  <h4>Recommendations</h4>
                  <ul style={{margin:0,paddingLeft:18}}><li>Focus on Pedagogy</li><li>Practice Math basics</li></ul>
                </div>
              </div>
            </div>

            <div style={{background:'#fff',padding:12,borderRadius:8,border:'1px solid #eef2ff',marginTop:12}}>
              <h3>Questions for selected paper</h3>
              <div style={{marginBottom:12}}>
                {selectedPaper ? `${selectedPaper} — ${questionsSummary.reduce((s,q)=>s + (Number(q.questionCount) || 0), 0)} questions` : 'No paper selected'}
              </div>

              {/* Sample questions grid (first few items across first few files) */}
              <div style={{marginBottom:12}}>
                <h4 style={{margin:'8px 0'}}>Sample questions</h4>
                {sampleQuestions.length===0 && <div className="muted">No sample questions available.</div>}
                <div className="sample-grid" style={{marginTop:8}}>
                  {sampleQuestions.map((q,i)=> (
                    <div key={q.id||i} className="question-card">
                      <div className="meta">{q._subject} • {q.topic || q.difficulty || ''}</div>
                      <div className="qid">{q.id}</div>
                      <div className="qtext">{typeof q.question==='string' ? (q.question.length>200? q.question.slice(0,200)+'…': q.question) : ''}</div>
                      {Array.isArray(q.options) && (
                        <ol>
                          {q.options.map((opt:any, idx:number)=>(<li key={idx}>{opt}</li>))}
                        </ol>
                      )}
                          <div className="actions" style={{marginTop:8}}>
                            <button className="btn outline" onClick={()=>setExplain(q)}>Explain</button>
                            <button className="btn" style={{marginLeft:8}} onClick={()=>{ setPreview(q); }}>Preview</button>
                          </div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:12}}>
                {questionsSummary.map((q,i)=> (
                  <div key={i} className="paper-card">
                    <div style={{fontSize:13,color:'#6b7281'}}>{q.subject} • {q.language}</div>
                    <div style={{fontWeight:700,marginTop:8}}>{q.questionCount} questions</div>
                    <div style={{marginTop:8}}>
                      <button className="btn" onClick={()=>onPreview(q.file)}>Preview</button>
                      <a className="btn outline" style={{marginLeft:8}} href={q.file} target="_blank" rel="noreferrer">Open</a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </main>
        </section>

        {/* Paper select modal */}
        {showPaperModal && (
          <Modal onClose={() => setShowPaperModal(false)} ariaLabel="Select your target paper">
            <div className="modal-full" style={{maxWidth:520}}>
              <h3 style={{marginTop:0}}>Select your target paper</h3>
              <p style={{color:'#6b7281'}}>Choose Paper 1 or Paper 2 to unlock tailored content.</p>
              <div style={{display:'flex',gap:12,justifyContent:'center',marginTop:16}}>
                <button className="btn" onClick={()=>choosePaper('Paper 1')}>Paper 1</button>
                <button className="btn" onClick={()=>choosePaper('Paper 2')}>Paper 2</button>
              </div>
              <div style={{marginTop:12}}><a className="btn outline" href="#" onClick={e=>{e.preventDefault(); setShowPaperModal(false)}}>Maybe later</a></div>
            </div>
          </Modal>
        )}

        {/* Preview modal */}
        {preview && (
          <Modal onClose={closePreview} ariaLabel={`Preview ${preview.id || ''}`}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <h4 style={{marginTop:0}}>Preview</h4>
              <div style={{fontSize:13,color:'#6b7281'}}>
                {previewFilePath ? `${previewIndex+1} / ${previewFileQuestions.length}` : ''}
              </div>
            </div>

            <div style={{fontWeight:700}}>{preview.id}</div>
            <div style={{marginTop:8}}>{preview.question}</div>
            {preview.options && (
              <ol style={{marginTop:8}}>
                {preview.options.map((o,i)=>(<li key={i}>{o}</li>))}
              </ol>
            )}

            {/* attachments handling */}
            {preview && (preview.attachments && Array.isArray(preview.attachments) && preview.attachments.length>0) && (
              <div style={{marginTop:12}}>
                <h5>Attachments</h5>
                <div style={{display:'flex',gap:12,flexWrap:'wrap'}}>
                  {preview.attachments.map((a:any, idx:number)=>{
                    const url = a.url || a || ''
                    const isImage = /\.(png|jpe?g|gif|svg)$/i.test(url)
                    return (
                      <div key={idx} style={{maxWidth:220}}>
                        {isImage ? (<img src={url} alt={`attachment-${idx}`} style={{width:'100%',height:'auto',borderRadius:8}} />) : (<a href={url} target="_blank" rel="noreferrer">Open attachment</a>)}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            <div style={{display:'flex',justifyContent:'flex-end',gap:8,marginTop:12,alignItems:'center'}}>
              <div style={{marginRight:'auto',color:'#6b7281'}}>
                Tip: use ← / → to navigate, Esc to close
              </div>
              <button className="btn outline" onClick={()=>prevQuestion()} disabled={!(previewIndex>0 || (previewFilePath && questionsSummary.findIndex(q=>q.file===previewFilePath)>0))}>Prev</button>
              <button className="btn" onClick={()=>nextQuestion()} style={{marginLeft:8}}>Next</button>
              <button className="btn outline" style={{marginLeft:8}} onClick={()=>closePreview()}>Close</button>
            </div>
          </Modal>
        )}

      </div>
    </div>
  )
}
