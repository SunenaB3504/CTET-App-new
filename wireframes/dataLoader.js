// Simple client-side data loader for the wireframe prototype
// Loads a manifest (pointer at data/index/manifest-latest.json) and exposes helpers
const CTETDataLoader = (function(){
  const manifestPath = '../data/index/manifest-latest.json';
  let manifest = null;
  const fileCache = new Map(); // filePath -> parsed JSON

  async function loadManifest(){
    if(manifest) return manifest;
    const res = await fetch(manifestPath);
    if(!res.ok) throw new Error('Failed to load manifest: ' + res.status);
    manifest = await res.json();
    return manifest;
  }

  async function getFilesForPaper(paper){
    await loadManifest();
    return manifest.files.filter(f => f.paper === paper);
  }

  async function listQuestions(paper){
    const files = await getFilesForPaper(paper);
    // return summary entries (subject, language, questionCount, file)
    return files.map(f => ({
      // make paths relative to the wireframes directory (dashboard is at /wireframes)
      file: '../' + f.output.replace(/\\/g,'/'),
      subject: f.subject,
      language: f.language,
      questionCount: f.questionCount
    }));
  }

  async function loadFile(filePath){
    // filePath may be relative; ensure proper URL
    if(fileCache.has(filePath)) return fileCache.get(filePath);
    const res = await fetch(filePath);
    if(!res.ok) throw new Error('Failed to load data file: ' + filePath);
    const j = await res.json();
    fileCache.set(filePath, j);
    return j;
  }

  async function getQuestionById(qid){
    await loadManifest();
    // look up in manifest.questionIndex if present
    if(manifest.questionIndex && manifest.questionIndex[qid] && manifest.questionIndex[qid].length){
      const entry = manifest.questionIndex[qid][0];
      const file = entry.file.replace(/\\/g,'/');
      const data = await loadFile('../' + file);
      if(data && data.questions){
        return data.questions.find(q => q.id === qid) || null;
      }
    }
    // fallback: scan files for the question id (inefficient; ok for prototype)
    for(const f of manifest.files){
      const file = f.output.replace(/\\/g,'/');
      const data = await loadFile('../' + file);
      if(data && Array.isArray(data.questions)){
        const q = data.questions.find(x => x.id === qid);
        if(q) return q;
      }
    }
    return null;
  }

  return {
    loadManifest,
    getFilesForPaper,
    listQuestions,
    loadFile,
    getQuestionById
  };
})();

// Expose globally for the prototype
window.CTETDataLoader = CTETDataLoader;
