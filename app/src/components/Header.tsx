import React, { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useHamburger } from '../lib/ui'

export default function Header(){
  useEffect(()=>{
    useHamburger()
  }, [])

  return (
    <header className="header">
      <button className="hamburger" aria-label="Toggle navigation" aria-expanded="false">
        <svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M3 6h18v2H3V6zm0 5h18v2H3v-2zm0 5h18v2H3v-2z"/></svg>
      </button>
      <div className="logo"><Link to="/dashboard" style={{color:'inherit',textDecoration:'none'}}>CTET Prep</Link></div>
      <nav className="nav">
        <Link to="/">Home</Link>
        <Link to="/study">Study</Link>
        <Link to="/questionbank">Question Bank</Link>
        <Link to="/mock">Mock Tests</Link>
        <Link className="cta" to="/login">Account</Link>
      </nav>
    </header>
  )
}
