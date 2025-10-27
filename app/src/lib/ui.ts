// Small runtime helpers for UI behavior migrated from wireframes/script.js
// useHamburger() wires up any .hamburger buttons to toggle body.nav-open
export function useHamburger(): void {
  // run on next tick in browser environment
  if (typeof window === 'undefined') return
  // Delay initialization slightly to let React mount header/nav
  setTimeout(() => {
    try{
      const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>('.hamburger'))
      buttons.forEach(h => {
        if((h as any).__hInit) return
        (h as any).__hInit = true
        const header = h.closest('.header') as HTMLElement | null
        const nav = header ? header.querySelector<HTMLElement>('.nav') : document.querySelector<HTMLElement>('.nav')
        let previousActive: Element | null = null

        function open(){
          if(!nav) return
          previousActive = document.activeElement
          document.body.classList.add('nav-open')
          h.setAttribute('aria-expanded','true')
          const focusable = nav.querySelectorAll<HTMLElement>('a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])')
          if(focusable.length) (focusable[0] as HTMLElement).focus()
          document.addEventListener('keydown', onKeydown)
        }

        function close(){
          document.body.classList.remove('nav-open')
          h.setAttribute('aria-expanded','false')
          if(previousActive && (previousActive as HTMLElement).focus) (previousActive as HTMLElement).focus()
          document.removeEventListener('keydown', onKeydown)
        }

        function onKeydown(e: KeyboardEvent){
          if(e.key === 'Escape'){ e.preventDefault(); close(); return }
          if(e.key === 'Tab'){
            if(!nav) return
            const nodes = Array.from(nav.querySelectorAll<HTMLElement>('a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])')).filter(n=>!n.hasAttribute('disabled'))
            if(nodes.length===0) return
            const idx = nodes.indexOf(document.activeElement as HTMLElement)
            if(e.shiftKey && idx===0){ e.preventDefault(); nodes[nodes.length-1].focus(); }
            else if(!e.shiftKey && idx===nodes.length-1){ e.preventDefault(); nodes[0].focus(); }
          }
        }

        h.addEventListener('click', ()=>{
          const isOpen = document.body.classList.contains('nav-open')
          if(isOpen) close(); else open()
        })
      })
    }catch(e){ console.warn('useHamburger init failed', e) }
  }, 50)
}

export default { useHamburger }
