import React from 'react';
import './App.css';
import PDFUpload from './components/PDFUpload';

function App() {
  return (
    <div className="min-h-screen bg-dark-900 py-8 px-4 sm:py-12 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8 sm:mb-12">
          <h1 className="text-3xl font-extrabold text-light-900 sm:text-4xl mb-3 sm:mb-4">
            pdfer
          </h1>
          <p className="text-base sm:text-xl text-light-300">
            Professional PDF editing made simple
          </p>
        </div>
        
        <div className="bg-dark-800 rounded-2xl shadow-2xl p-4 sm:p-6 md:p-8 border border-dark-700">
          <PDFUpload />
        </div>
        
        <div className="mt-8 sm:mt-12 text-center text-light-500 text-xs sm:text-sm">
          <p>Upload a PDF, edit content, and download your modified document</p>
        </div>
      </div>
    </div>
  );
}

export default App;