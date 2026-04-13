// project_client.js — frontend helpers for the /api/project endpoints.
//
// These functions wrap the three backend routes we need:
//   POST /api/project/run            -> start a new analysis
//   GET  /api/project/<run>/status   -> poll progress
//   GET  /api/project/<id>/data      -> fetch final result bundle
//
// The backend mints two different IDs:
//   run_id     — opaque handle for the status poll, available immediately
//   project_id — MiroFish project id, only known after stage 1 completes
//
// Both are surfaced via the status endpoint.

/**
 * Kick off a new pipeline run with a JSON body (no file upload).
 * @param {object} opts
 * @param {string} opts.requirement  - prediction brief (required)
 * @param {string} [opts.docText]    - optional document body
 * @param {string} [opts.projectName]
 * @param {number} [opts.maxRounds=30]
 * @returns {Promise<string>} run_id
 */
export async function startPipeline({ requirement, docText = '', projectName = 'Untitled Analysis', maxRounds = 30 }) {
  const res = await fetch('/api/project/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      requirement,
      doc_text: docText,
      project_name: projectName,
      max_rounds: maxRounds,
    }),
  });
  if (!res.ok) throw new Error(`startPipeline ${res.status}`);
  const body = await res.json();
  if (!body.success) throw new Error(body.error || 'startPipeline failed');
  return body.data.run_id;
}

/**
 * Kick off a new pipeline run with a file upload (multipart/form-data).
 * The uploaded file is used as the Stage 1 ontology input document so
 * the LLM has rich context to extract entities from.
 *
 * @param {object} opts
 * @param {string} opts.requirement
 * @param {File}   opts.file
 * @param {string} [opts.projectName]
 * @param {number} [opts.maxRounds=30]
 * @returns {Promise<string>} run_id
 */
export async function startPipelineMultipart({ requirement, file, projectName = 'Untitled Analysis', maxRounds = 30 }) {
  const form = new FormData();
  form.append('requirement', requirement);
  form.append('project_name', projectName);
  form.append('max_rounds', String(maxRounds));
  form.append('files', file);

  const res = await fetch('/api/project/run', {
    method: 'POST',
    body: form,
  });
  if (!res.ok) throw new Error(`startPipelineMultipart ${res.status}`);
  const body = await res.json();
  if (!body.success) throw new Error(body.error || 'startPipelineMultipart failed');
  return body.data.run_id;
}

/**
 * Fetch the list of all projects on the server.
 * @returns {Promise<Array<{project_id, created_at, size_bytes, has_report, title?}>>}
 */
export async function listProjects() {
  const res = await fetch('/api/project/list');
  if (!res.ok) throw new Error(`listProjects ${res.status}`);
  const body = await res.json();
  if (!body.success) throw new Error(body.error || 'listProjects failed');
  return body.data || [];
}

/**
 * Poll a run until it reaches a terminal state, calling onUpdate(status)
 * on every change. Resolves with the final status on success or rejects
 * on failure.
 *
 * @param {string} runId
 * @param {(status: object) => void} onUpdate
 * @param {object} [opts]
 * @param {number} [opts.intervalMs=2000]
 * @param {AbortSignal} [opts.signal]
 */
export async function pollPipeline(runId, onUpdate, { intervalMs = 2000, signal } = {}) {
  while (true) {
    if (signal && signal.aborted) throw new Error('aborted');
    const res = await fetch(`/api/project/${runId}/status`);
    if (!res.ok) throw new Error(`pollPipeline ${res.status}`);
    const body = await res.json();
    if (!body.success) throw new Error(body.error || 'status failed');
    const status = body.data;
    onUpdate && onUpdate(status);
    if (status.status === 'completed') return status;
    if (status.status === 'failed') {
      const err = new Error(status.error || 'pipeline failed');
      err.stage = status.stage;
      throw err;
    }
    await new Promise(r => setTimeout(r, intervalMs));
  }
}

/**
 * Fetch the result bundle for a completed project.
 * @param {string} projectId
 * @returns {Promise<object>}
 */
export async function fetchProjectData(projectId) {
  const res = await fetch(`/api/project/${projectId}/data`);
  if (!res.ok) throw new Error(`fetchProjectData ${res.status}`);
  const body = await res.json();
  if (!body.success) throw new Error(body.error || 'fetchProjectData failed');
  return body.data;
}

/**
 * Convenience: translate a backend report object into the shape that
 * src/screens/report.js expects (same shape as src/data/report.js).
 *
 * The MiroFish /api/report/<id> response contains:
 *   {
 *     report_id, simulation_id, status,
 *     outline: { sections: [{ num, title, ... }] },
 *     markdown_content: "...",   // full markdown
 *     ...
 *   }
 *
 * We need to produce:
 *   { title, subtitle, abstract, sections: [{num, title, body}], risks, references, ... }
 *
 * For M1 we fall back to dumping the whole markdown into the first section
 * if outline isn't present. M2 will parse the markdown into structured
 * sections properly.
 */
export function adaptReportForFrontend(backendData) {
  const report = backendData?.report || {};
  const md = backendData?.report_markdown || report.markdown_content || '';

  // Best-effort title extraction from the markdown (first H1)
  const titleMatch = md.match(/^#\s+(.+)$/m);
  const title = titleMatch ? titleMatch[1].trim() : 'Loka Analysis Report';

  // Best-effort abstract: everything between the title and first H2
  let abstract = '';
  if (titleMatch) {
    const after = md.slice(titleMatch.index + titleMatch[0].length);
    const nextH2 = after.match(/\n##\s+/);
    abstract = (nextH2 ? after.slice(0, nextH2.index) : after).trim();
  }

  // Parse H2 sections
  const sections = [];
  const h2Regex = /^##\s+(.+)$/gm;
  let match;
  const positions = [];
  while ((match = h2Regex.exec(md)) !== null) {
    positions.push({ index: match.index, title: match[1].trim() });
  }
  for (let i = 0; i < positions.length; i++) {
    const p = positions[i];
    const end = i + 1 < positions.length ? positions[i + 1].index : md.length;
    const body = md.slice(p.index + p.title.length + 3, end).trim();
    // Strip the leading number like "1. " or "1 " if present
    const numMatch = p.title.match(/^(\d+(?:\.\d+)?)[.\s]+(.+)$/);
    sections.push({
      num: numMatch ? numMatch[1] : String(i + 1),
      title: numMatch ? numMatch[2] : p.title,
      body: markdownToHtml(body),
    });
  }

  return {
    classification: 'CONFIDENTIAL',
    date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    model: 'Loka World Model Engine v1.0',
    title,
    subtitle: '',
    abstract: markdownToHtml(abstract),
    sections,
    references: [],
    risks: [],
  };
}

/**
 * Minimal markdown → HTML converter. Just enough to render our reports:
 * bold, italic, inline code, paragraphs, lists, headers.
 * For real markdown we'd pull in marked.js, but this avoids a dependency.
 */
function markdownToHtml(md) {
  if (!md) return '';
  // Escape HTML first
  let html = md
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Code blocks
  html = html.replace(/```([^`]+)```/gs, (_, c) => `<pre><code>${c}</code></pre>`);
  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  // Bold / italic
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  // Lists (basic: lines starting with - or *)
  html = html.replace(/(?:^|\n)((?:[-*]\s+.+\n?)+)/g, (block) => {
    const items = block.trim().split('\n')
      .map(l => l.replace(/^[-*]\s+/, '').trim())
      .filter(Boolean)
      .map(l => `<li>${l}</li>`).join('');
    return `\n<ul>${items}</ul>`;
  });
  // Paragraphs: split on double newlines
  html = html.split(/\n\n+/)
    .map(p => {
      const t = p.trim();
      if (!t) return '';
      if (t.startsWith('<') && (t.startsWith('<ul') || t.startsWith('<pre'))) return t;
      return `<p>${t.replace(/\n/g, '<br/>')}</p>`;
    })
    .join('\n');
  return html;
}
