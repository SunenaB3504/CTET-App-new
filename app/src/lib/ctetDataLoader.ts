export type ManifestFile = {
  input: string;
  output: string;
  paper: string;
  term?: string;
  year?: number;
  subject?: string;
  language?: string;
  questionCount?: number;
}

export type Manifest = {
  generatedAt: string;
  files: ManifestFile[];
  questionIndex?: Record<string, any>;
}

const manifestUrl = '/data/index/manifest-latest.json';

let manifestCache: Manifest | null = null;

export async function loadManifest(): Promise<Manifest> {
  if (manifestCache) return manifestCache;
  const res = await fetch(manifestUrl);
  if (!res.ok) throw new Error('Failed to load manifest');
  const json = await res.json() as Manifest;
  manifestCache = json;
  return json;
}

export async function listQuestions(paper: string) {
  const m = await loadManifest();
  const files = m.files.filter(f => f.paper === paper);
  return files.map(f => ({
    file: '/' + f.output.replace(/\\/g, '/'),
    subject: f.subject,
    language: f.language,
    questionCount: f.questionCount || 0
  }));
}

export async function listPapers() {
  const m = await loadManifest();
  const map = new Map<string, {count:number}>();
  for (const f of m.files) {
    const key = f.paper || 'Unknown';
    const prev = map.get(key) || {count:0};
    prev.count += (f.questionCount || 0);
    map.set(key, prev);
  }
  return Array.from(map.entries()).map(([paper, {count}])=>({paper, count}));
}

export async function loadFile(path: string){
  const res = await fetch(path);
  if(!res.ok) throw new Error('Failed to load file: '+path);
  return res.json();
}

export async function getQuestionById(qid: string){
  const m = await loadManifest();
  // try manifest index first
  if(m.questionIndex && (m.questionIndex as any)[qid] && (m.questionIndex as any)[qid].length){
    const entry = (m.questionIndex as any)[qid][0];
    const file = '/' + entry.file.replace(/\\/g,'/');
    try{
      const data = await loadFile(file);
      if(data && Array.isArray(data.questions)){
        return data.questions.find((q:any)=> q.id === qid) || null;
      }
    }catch(e){/* continue to fallback */}
  }
  // fallback: scan files (inefficient but reliable)
  for(const f of m.files){
    const file = '/' + f.output.replace(/\\/g,'/');
    try{
      const data = await loadFile(file);
      if(data && Array.isArray(data.questions)){
        const q = data.questions.find((x:any)=> x.id === qid);
        if(q) return q;
      }
    }catch(e){ /* ignore and continue */ }
  }
  return null;
}

export default { loadManifest, listQuestions, listPapers, loadFile };
