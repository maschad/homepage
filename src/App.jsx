import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './components/Home';
import Article from './components/Article';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/articles/:articleId" element={<Article />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;