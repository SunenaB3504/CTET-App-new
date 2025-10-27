import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Header from './components/Header'
import Dashboard from './pages/Dashboard'
import Study from './pages/Study'
import QuestionBank from './pages/QuestionBank'
import Mock from './pages/Mock'
import Login from './pages/Login'
import AdminUpload from './pages/AdminUpload'
import Results from './pages/Results'

export default function App(){
  return (
    <div>
      <Header />
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/study" element={<Study />} />
        <Route path="/questionbank" element={<QuestionBank />} />
        <Route path="/mock" element={<Mock />} />
        <Route path="/login" element={<Login />} />
        <Route path="/admin" element={<AdminUpload />} />
        <Route path="/results" element={<Results />} />
      </Routes>
    </div>
  )
}
