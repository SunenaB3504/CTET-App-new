export type RawChapter = {
  id?: number | string;
  title?: string;
  summary?: string;
  questions?: any[];
  [k: string]: any;
}

export type StudyFile = {
  subject?: string;
  paper?: string;
  language?: string;
  chapters?: RawChapter[];
  source?: string;
}

// Try to be resilient: prefer a small manifest at /Docs/StudyData/Dec24/manifest.json
// If missing, fall back to a conservative built-in filename list (from repo known inputs).
const STUDY_MANIFEST_URL = '/Docs/StudyData/Dec24/manifest.json';

const FALLBACK_FILES = [
  '/Docs/StudyData/Dec24/Guide-Paper2-Dec24-D-ENG.json',
  '/Docs/StudyData/Dec24/Guide-Paper2-Dec24-D-Hindi.json',
  '/Docs/StudyData/Dec24/Guide-Paper2-Dec24-D-Maths-Sci.json',
  '/Docs/StudyData/Dec24/Guide-Paper2-Dec24-D-SST.json',
  '/Docs/StudyData/Dec24/Guide-Paper2-Dec24-D-CDP.json',
];

type ManifestEntry = { url: string; subject?: string; language?: string; paper?: string };

function inferMetaFromFilename(path: string): { subject?: string; language?: string; paper?: string } {
  const file = path.split('/').pop() || path;
  const parts = file.replace(/\.json$/i, '').split(/[-_]/);
  // Heuristic: look for language code at end (ENG, Hindi, SST etc.) and Paper2 token
  const res: any = {};
  if (/Paper2/i.test(file)) res.paper = 'Paper 2';
  const lang = parts[parts.length - 1];
  if (/^(ENG|EN)$/i.test(lang)) res.language = 'English';
  else if (/^(Hindi|HIN)$/i.test(lang)) res.language = 'Hindi';
  else if (/^(Maths|Math|Maths-Sci|Maths_Sci)$/i.test(parts.join('-'))) res.language = 'English';
  else if (/^(SST|Social|SST)$/i.test(lang)) res.language = 'English';

  // Subject inference via known tokens
  if (/CDP/i.test(file)) res.subject = 'Child Development & Pedagogy';
  else if (/ENG/i.test(file) && !/Maths/i.test(file)) res.subject = 'English';
  else if (/Hindi/i.test(file)) res.subject = 'Hindi';
  else if (/Maths/i.test(file) || /Math/i.test(file)) res.subject = 'Mathematics';
  else if (/SST/i.test(file)) res.subject = 'Social Studies';

  return res;
}

async function fetchManifest(): Promise<ManifestEntry[]> {
  try {
    const res = await fetch(STUDY_MANIFEST_URL);
    if (!res.ok) throw new Error('no manifest');
    const json = await res.json();
    if (Array.isArray(json)) return json.map((e: any) => ({ url: e.url || e.path, subject: e.subject, language: e.language, paper: e.paper }));
  } catch (e) {
    // ignore and fallback
  }
  return FALLBACK_FILES.map(u => ({ url: u, ...inferMetaFromFilename(u) }));
}

export async function loadStudyList(): Promise<ManifestEntry[]> {
  return await fetchManifest();
}

export async function loadStudyFile(url: string): Promise<StudyFile> {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch study file: ' + url);
  const json = await res.json();
  // Normalization: if top-level is array -> treat as chapters
  let payload: StudyFile = { source: url } as any;
  if (Array.isArray(json)) {
    payload.chapters = json.map((c: any, idx: number) => ({ id: c.id ?? idx + 1, title: c.title ?? c.name ?? `Chapter ${idx + 1}`, ...c }));
    // try to infer metadata from filename
    Object.assign(payload, inferMetaFromFilename(url));
  } else if (json && typeof json === 'object') {
    // accept common shapes: { chapters: [...] } or { id,title,questions }
    if (Array.isArray((json as any).chapters)) payload = { ...json, source: url } as StudyFile;
    else if (Array.isArray((json as any).questions) ) {
      // wrap single-chapter style
      payload = { source: url, chapters: [{ id: (json as any).id ?? 1, title: (json as any).title ?? 'Chapter 1', ...(json as any) }] } as StudyFile;
    } else {
      payload = { source: url, chapters: [{ id: 1, title: (json as any).title || 'Chapter 1', ...(json as any) }] } as StudyFile;
    }
    if (!payload.subject) Object.assign(payload, inferMetaFromFilename(url));
  }
  return payload;
}

export default { loadStudyList, loadStudyFile };
