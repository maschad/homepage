// Article.jsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { marked } from 'marked';
import hljs from 'highlight.js';

function Article() {
  const { articleId } = useParams();
  const navigate = useNavigate();
  const [articleContent, setArticleContent] = useState('');

  useEffect(() => {
    document.body.classList.add('article-open');
    return () => {
      document.body.classList.remove('article-open');
    };
  }, []);

  useEffect(() => {
    function handleEscapeKey(event) {
      if (event.key === 'Escape') {
        handleClose();
      }
    }

    document.addEventListener('keydown', handleEscapeKey);
    return () => document.removeEventListener('keydown', handleEscapeKey);
  }, [navigate]);

  function renderArticle(markdown) {
    const sections = markdown.split('###');
    const titleMatch = sections[0].match(/# (.*?)\n/);
    const title = titleMatch ? titleMatch[1] : '';
    const metadataSection = sections[0].split('## Metadata')[1];
    if (!metadataSection) return 'Error: No metadata section found';

    const metadataLines = metadataSection
      .split('\n')
      .filter(line => line.trim() !== '')
      .map(line => {
        if (line.includes('[original article]')) {
          const match = line.match(/\[original article\]\((.*?)\)/);
          if (match) {
            const url = match[1];
            return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="inline-block mt-4 px-4 py-2 border border-terminal rounded hover:bg-terminal/10 transition font-bold text-center">original article</a>`;
          }
        }
        return `<p>${line}</p>`;
      })
      .join('\n');

    const body = sections[1] ? sections[1].replace('Body', '').trim() : '';

    marked.setOptions({
      highlight: function(code, lang) {
        if (!code) return '';
        if (lang && hljs.getLanguage(lang)) {
          return hljs.highlight(code, { language: lang }).value;
        }
        return code;
      },
      langPrefix: 'hljs language-'
    });

    const renderer = new marked.Renderer();
    renderer.code = function (code, language) {
      const codeText = typeof code === 'object' ? code.text : code;
      const codeLang = typeof code === 'object' ? code.lang : language;
      const validLanguage = codeLang && hljs.getLanguage(codeLang) ? codeLang : 'plaintext';
      const highlightedCode = hljs.highlight(codeText, { language: validLanguage }).value;

      return `
        <div class="relative bg-neutral-900 p-4 rounded shadow mt-4 mb-4">
          <button class="absolute top-2 right-2 text-green-400 hover:text-green-300" data-code="${encodeURIComponent(
            codeText
          )}">📋</button>
          <pre><code class="hljs language-${validLanguage}">${highlightedCode}</code></pre>
        </div>
      `;
    };

    return `
      <div class="max-w-3xl mx-auto font-mono text-[#a8ff60]">
        <h1 class="text-4xl sm:text-5xl font-bold text-center mb-8 text-[#00ff00] drop-shadow-[0_0_8px_#00ff00]">
          ${title.replace(/\n/g, '<br/>')}
        </h1>
        <div class="bg-[#002200] text-green-200 p-4 border-l-4 border-[#00ff00] rounded mb-8 text-sm">
          ${metadataLines}
        </div>
        <div class="prose prose-invert prose-green max-w-none text-[#a8ff60] font-mono prose-h1:text-[#00ff00] prose-h2:text-[#00ff00] prose-a:text-[#00ff00] prose-a:no-underline hover:prose-a:underline prose-pre:bg-[#111] prose-code:text-green-300">
          ${marked(body, { renderer })}
        </div>
      </div>
    `;
  }

  useEffect(() => {
    async function loadArticle() {
      try {
        const response = await fetch(`/articles/${articleId}.md`);
        if (!response.ok) throw new Error('Article not found');

        const markdown = await response.text();
        const articleHTML = renderArticle(markdown);
        setArticleContent(articleHTML);

        setTimeout(() => {
          setupCopyButtons();
        }, 0);
      } catch (error) {
        console.error('Error loading article:', error);
      }
    }
    loadArticle();
  }, [articleId]);

  function setupCopyButtons() {
    document.querySelectorAll('button[data-code]').forEach(button => {
      button.addEventListener('click', () => {
        const code = decodeURIComponent(button.dataset.code);
        navigator.clipboard.writeText(code);
      });
    });
  }

  function handleClose() {
    navigate('/');
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center article">
      {/* Full Black Background Layer */}
      <div className="fixed inset-0 bg-black z-[-1]" />

      {/* Article Content Layer */}
      <div className="relative w-full max-w-3xl overflow-y-auto px-4 py-10 font-mono text-[#a8ff60]">
        <button
          className="fixed top-4 right-4 text-terminal text-3xl hover:drop-shadow-green-glow z-[10000]"
          onClick={handleClose}
        >
          ×
        </button>

        <div
          className="prose prose-invert prose-green"
          dangerouslySetInnerHTML={{ __html: articleContent }}
        />
      </div>
    </div>
  );
}

export default Article;