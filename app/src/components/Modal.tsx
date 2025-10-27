import React, { useEffect, useRef } from 'react'

type Props = {
  children: React.ReactNode;
  onClose: () => void;
  ariaLabel?: string;
}

export default function Modal({ children, onClose, ariaLabel }: Props){
  const overlayRef = useRef<HTMLDivElement | null>(null)
  const previousActive = useRef<HTMLElement | null>(null)

  useEffect(()=>{
    previousActive.current = document.activeElement as HTMLElement
    const overlay = overlayRef.current
    if(!overlay) return

    function onKey(e: KeyboardEvent){
      if(e.key === 'Escape') { e.preventDefault(); onClose(); }
      if(e.key === 'Tab'){
        const focusable = overlay!.querySelectorAll<HTMLElement>('a[href], button, textarea, input, select, [tabindex]:not([tabindex="-1"])')
        const nodes = Array.from(focusable).filter(n=>!n.hasAttribute('disabled'))
        if(nodes.length===0) return
        const idx = nodes.indexOf(document.activeElement as HTMLElement)
        if(e.shiftKey && idx === 0){ e.preventDefault(); nodes[nodes.length-1].focus(); }
        else if(!e.shiftKey && idx === nodes.length-1){ e.preventDefault(); nodes[0].focus(); }
      }
    }

    document.addEventListener('keydown', onKey)
    // focus first focusable element inside overlay
    requestAnimationFrame(()=>{
      const first = overlay.querySelector<HTMLElement>('a[href], button, textarea, input, select, [tabindex]:not([tabindex="-1"])')
      if(first) first.focus()
    })

    return ()=>{
      document.removeEventListener('keydown', onKey)
      if(previousActive.current && previousActive.current.focus) previousActive.current.focus()
    }
  },[onClose])

  return (
    <div ref={overlayRef} role="dialog" aria-modal="true" aria-label={ariaLabel || 'Dialog'} style={{position:'fixed',inset:0,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(0,0,0,0.5)',zIndex:60}}>
      <div style={{background:'#fff',padding:20,borderRadius:10,maxWidth:'95%',width:900,boxShadow:'0 10px 30px rgba(0,0,0,0.2)'}}>
        {children}
      </div>
    </div>
  )
}
