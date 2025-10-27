// Minimal script to show basic interactions (simulate nav highlights)
// runOnReady helper — call fn immediately if DOM is already ready, else wait for DOMContentLoaded
function runOnReady(fn){
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
  else fn();
}

// Initialize hamburger behavior for all existing buttons (injected or markup)
function initHamburgers(){
  console.debug('[nav] initHamburgers: scanning for .hamburger elements');
  document.querySelectorAll('.hamburger').forEach(h => {
    if(h.dataset.hInit) return; // already initialized
    h.dataset.hInit = '1';
    const header = h.closest('.header');
    const nav = header ? header.querySelector('.nav') : document.querySelector('.nav');
    let previousActive = null;

    function open(){
      if(!nav) return;
      previousActive = document.activeElement;
      document.body.classList.add('nav-open');
      h.setAttribute('aria-expanded','true');
      // focus first focusable in nav
      const focusable = nav.querySelectorAll('a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])');
      if(focusable.length) focusable[0].focus();
      // add keydown handler for trap & ESC
      document.addEventListener('keydown', onKeydown);
    }

    function close(){
      document.body.classList.remove('nav-open');
      h.setAttribute('aria-expanded','false');
      if(previousActive && previousActive.focus) previousActive.focus();
      document.removeEventListener('keydown', onKeydown);
    }

    function onKeydown(e){
      if(e.key === 'Escape'){
        e.preventDefault(); close(); return;
      }
      if(e.key === 'Tab'){
        if(!nav) return;
        const nodes = Array.from(nav.querySelectorAll('a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])')).filter(n=>!n.hasAttribute('disabled'));
        if(nodes.length===0) return;
        const idx = nodes.indexOf(document.activeElement);
        if(e.shiftKey && idx===0){ e.preventDefault(); nodes[nodes.length-1].focus(); }
        else if(!e.shiftKey && idx===nodes.length-1){ e.preventDefault(); nodes[0].focus(); }
      }
    }

    h.addEventListener('click', function(){
      const isOpen = document.body.classList.contains('nav-open');
      if(isOpen) close(); else open();
    });
  });
}

// Top-level initialization: inject hamburger, mark CTA clicks, register SW and init hamburgers
function topInit(){
  // small enhancement: mark CTA clicks
  document.querySelectorAll('.btn, .nav a').forEach(el=>{
    el.addEventListener('click',e=>{
      // allow normal navigation; just log
      console.log('Navigate:', el.getAttribute('href'))
    })
  })

  // Register service worker if available (PWA basics)
  if('serviceWorker' in navigator){
    navigator.serviceWorker.register('./sw.js').then(reg=>{
      console.log('Service worker registered', reg.scope);
    }).catch(err=>console.log('SW registration failed', err));
  }

  // Inject a hamburger button into header for small screens (accessible)
  function injectHamburger(){
    try{
      // prefer .header but fall back to any <header> element
      var header = document.querySelector('.header') || document.querySelector('header');
      console.debug('[nav] injectHamburger: header element?', !!header);
      if(!header) return false;
      // Ensure there is a .nav element for the hamburger overlay. If not, create a basic nav with common links.
      var nav = header.querySelector('.nav');
      if(!nav){
        nav = document.createElement('nav');
        nav.className = 'nav';
        nav.innerHTML = '<a href="dashboard.html">Dashboard</a><a href="study.html">Study</a><a href="questionbank.html">Question Bank</a><a href="mock_setup.html">Mock Tests</a><a href="login.html">Login</a>';
        header.appendChild(nav);
        console.debug('[nav] injectHamburger: created .nav');
      }
      // if hamburger already present in HTML, don't inject another
      if(header.querySelector('.hamburger')){ console.debug('[nav] injectHamburger: hamburger already present'); return true; }
      var btn = document.createElement('button');
      btn.className = 'hamburger';
      btn.setAttribute('aria-label','Toggle navigation');
      btn.setAttribute('aria-expanded','false');
      btn.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M3 6h18v2H3V6zm0 5h18v2H3v-2zm0 5h18v2H3v-2z"/></svg>';
      // click toggles body.nav-open
      btn.addEventListener('click', function(){ document.body.classList.toggle('nav-open'); btn.setAttribute('aria-expanded', document.body.classList.contains('nav-open')) });
      header.insertBefore(btn, header.firstChild);
      console.debug('[nav] injectHamburger: injected button into header');
      return true;
    }catch(e){console.warn('Failed to inject hamburger', e); return false}
  }
  // attempt immediate injection
  injectHamburger();

  // init now and also after DOM mutations if any
  initHamburgers();

  // MutationObserver fallback: if header is added later (dynamic pages), watch and inject once
  try{
    var observer = new MutationObserver((mutations, obs) => {
      // try to inject; if successful, initialize and disconnect
      const did = injectHamburger();
      if(did){ initHamburgers(); obs.disconnect(); console.debug('[nav] MutationObserver: header detected and hamburger injected — observer disconnected'); }
    });
    observer.observe(document.documentElement || document.body, { childList: true, subtree: true });
    // store on window so tests/debugging can access
    window._navObserver = observer;
  }catch(e){ console.debug('[nav] MutationObserver not available', e) }
}

runOnReady(topInit);

// Paper selection utilities (persist in localStorage)
function getSelectedPaper(){
  return localStorage.getItem('selectedPaper') || null;
}

function setSelectedPaper(paper){
  localStorage.setItem('selectedPaper', paper);
  // dispatch event so other parts can update
  window.dispatchEvent(new CustomEvent('paperChanged', {detail: {paper}}));
}

document.addEventListener('DOMContentLoaded', function(){
  // wire up any paper select buttons: elements with data-select-paper
  document.querySelectorAll('[data-select-paper]').forEach(btn=>{
    btn.addEventListener('click', function(e){
      var p = this.getAttribute('data-select-paper');
      setSelectedPaper(p);
      // if modal, hide it
      var modal = document.getElementById('paper-select-modal');
      if(modal) modal.style.display = 'none';
    })
  })

  // Update any UI elements that should show current paper
  function applyPaperToUI(){
    var sel = getSelectedPaper();
    document.querySelectorAll('[data-current-paper]').forEach(el=>{
      el.textContent = sel ? sel : 'None';
    })
    // preselect in mock setup if select exists
    var selBox = document.querySelector('select[name="paper"]');
    if(selBox && sel){
      for(var i=0;i<selBox.options.length;i++){
        if(selBox.options[i].text === sel){ selBox.selectedIndex = i; break }
      }
    }
  }

  applyPaperToUI();
  // Load manifest and render question summaries for the selected paper
  async function renderPaperQuestions(){
    const container = document.getElementById('paper-questions-list');
    const summary = document.getElementById('paper-questions-summary');
    if(!container || !summary || !window.CTETDataLoader) return;
    const sel = getSelectedPaper();
    if(!sel){ summary.textContent = 'No paper selected.'; container.innerHTML=''; return; }
    try{
      await window.CTETDataLoader.loadManifest();
      const files = await window.CTETDataLoader.listQuestions(sel);
      if(!files || files.length===0){ summary.textContent = `No content available for ${sel}.`; container.innerHTML = ''; return; }
      // summary
      const total = files.reduce((s,f)=>s + (f.questionCount || 0), 0);
      summary.textContent = `${total} questions available across ${files.length} subject files.`;
      // render cards
      container.innerHTML = '';
      files.forEach(f=>{
        const card = document.createElement('div');
        card.style.padding = '12px';
        card.style.border = '1px solid #eef6ff';
        card.style.borderRadius = '8px';
        card.style.background = '#fbfdff';
        card.innerHTML = `<h4 style="margin:0 0 8px 0">${f.subject}</h4><div>${f.questionCount} questions • ${f.language}</div><div style="margin-top:8px"><button class=\"btn\" data-load-file=\"${f.file}\">Preview</button></div>`;
        container.appendChild(card);
      });
      // wire preview buttons
      container.querySelectorAll('[data-load-file]').forEach(btn=>{
        btn.addEventListener('click', async function(){
          const fp = this.getAttribute('data-load-file');
          try{
            const data = await window.CTETDataLoader.loadFile(fp);
            // show first 3 questions
            const preview = data.questions ? data.questions.slice(0,3) : [];
            const dlg = document.createElement('div');
            dlg.id = 'preview-dialog';
            dlg.style.position='fixed'; dlg.style.inset='0'; dlg.style.background='rgba(0,0,0,0.5)'; dlg.style.display='flex'; dlg.style.alignItems='center'; dlg.style.justifyContent='center';
            const inner = document.createElement('div'); inner.style.background='#fff'; inner.style.padding='18px'; inner.style.borderRadius='10px'; inner.style.maxWidth='720px'; inner.style.width='90%';
            inner.innerHTML = `<h3>Preview — ${fp.split('/').pop()}</h3>`;
            preview.forEach(q=>{ inner.innerHTML += `<div style=\"margin-top:12px;\"><strong>${q.id}</strong>: ${q.question}<div style=\"color:#6b7281;\">Options: ${q.options?q.options.join(', '):'N/A'}</div></div>` });
            inner.innerHTML += '<div style="margin-top:12px;text-align:right"><button class="btn" data-close>Close</button></div>';
            dlg.appendChild(inner); document.body.appendChild(dlg);
            dlg.querySelector('[data-close]').addEventListener('click', ()=> dlg.remove());
          }catch(err){ alert('Failed to load preview: '+err.message); }
        })
      })
    }catch(err){ summary.textContent = 'Error loading content: '+err.message; container.innerHTML=''; }
  }

  renderPaperQuestions();
  window.addEventListener('paperChanged', renderPaperQuestions);
  window.addEventListener('paperChanged', applyPaperToUI);

  // Filter visible demo content by selected paper
  function filterContentByPaper(){
    const sel = getSelectedPaper();
    document.querySelectorAll('[data-show-for-paper]').forEach(el=>{
      const allowed = el.getAttribute('data-show-for-paper').split(',').map(s=>s.trim());
      if(!sel){
        // if no selection, show items that allow 'any' or are unspecified
        if(allowed.includes('any') || allowed.length===0) el.style.display = '';
        else el.style.display = 'none';
      } else {
        if(allowed.includes(sel)) el.style.display = '';
        else el.style.display = 'none';
      }
    });
  }

  // enhance modal accessibility: trap focus and close on Esc
  function enhanceModal(modal){
    if(!modal) return;
    modal.setAttribute('role','dialog');
    modal.setAttribute('aria-modal','true');
    const focusable = 'a[href], button, textarea, input, select, [tabindex]:not([tabindex="-1"])';
    let previousActive = null;
    function open(){
      previousActive = document.activeElement;
      modal.style.display = 'flex';
      const first = modal.querySelector(focusable);
      if(first) first.focus();
      document.addEventListener('keydown', onKeyDown);
    }
    function close(){
      modal.style.display = 'none';
      if(previousActive && previousActive.focus) previousActive.focus();
      document.removeEventListener('keydown', onKeyDown);
    }
    function onKeyDown(e){
      if(e.key === 'Escape') close();
      if(e.key === 'Tab'){
        const nodes = Array.from(modal.querySelectorAll(focusable)).filter(n=>!n.hasAttribute('disabled'));
        if(nodes.length===0) return;
        const idx = nodes.indexOf(document.activeElement);
        if(e.shiftKey && idx===0){ e.preventDefault(); nodes[nodes.length-1].focus(); }
        else if(!e.shiftKey && idx===nodes.length-1){ e.preventDefault(); nodes[0].focus(); }
      }
    }
    // open/close hooks
    modal.querySelectorAll('[data-close-modal]').forEach(btn=> btn.addEventListener('click', close));
    modal.querySelectorAll('[data-select-paper]').forEach(btn=> btn.addEventListener('click', ()=>{ close(); }));
    // expose open
    modal.open = open;
    modal.close = close;
  }

  // apply filter initially and when paper changes
  filterContentByPaper();
  window.addEventListener('paperChanged', filterContentByPaper);

  // enhance existing modal if present
  var modalEl = document.getElementById('paper-select-modal');
  enhanceModal(modalEl);

  // Show modal if present and no selection yet (simulate after-login flow)
  var modal = document.getElementById('paper-select-modal');
  if(modal){
    if(!getSelectedPaper()){
      modal.style.display = 'flex';
    }
    // close handler
    var closeBtn = modal.querySelector('[data-close-modal]');
    if(closeBtn){ closeBtn.addEventListener('click', function(){ modal.style.display='none' }) }
  }
});