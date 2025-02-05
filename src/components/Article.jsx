import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { marked } from 'marked';
import hljs from 'highlight.js';

function Article() {
  const { articleId } = useParams();
  const navigate = useNavigate();
  const [articleContent, setArticleContent] = useState('');

  // Add useEffect for escape key handling
  useEffect(() => {
    function handleEscapeKey(event) {
      if (event.key === 'Escape') {
        handleClose();
      }
    }

    // Add event listener
    document.addEventListener('keydown', handleEscapeKey);

    // Cleanup
    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [navigate]);  // Add navigate to dependencies

  function renderArticle(markdown) {
    const sections = markdown.split('###');

    // Parse title (first # section)
    const titleMatch = sections[0].match(/# (.*?)\n/);
    const title = titleMatch ? titleMatch[1] : '';

    // Parse metadata section (everything between ## Metadata and ### Body)
    const metadataSection = sections[0].split('## Metadata')[1];
    if (!metadataSection) return 'Error: No metadata section found';

    // Split metadata into lines and process them
    const metadataLines = metadataSection
      .split('\n')
      .filter(line => line.trim() !== '');

    // Process each line, with special handling for [original article] link
    const processedMetadataLines = metadataLines.map(line => {
      if (line.includes('[original article]')) {
        const match = line.match(/\[original article\]\((.*?)\)/);
        if (match) {
          const url = match[1];
          return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="original-article-link">original article</a>`;
        }
      }
      return line;
    });

    const metadata = processedMetadataLines.join('\n');

    // Parse body (### section)
    const body = sections[1] ? sections[1].replace('Body', '').trim() : '';

    // Configure marked with highlighting and custom renderer
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

    // Custom renderer to wrap code blocks in copyable container
    const renderer = new marked.Renderer();
    renderer.code = function(code, language) {
      const codeText = typeof code === 'object' ? code.text : code;
      const codeLang = typeof code === 'object' ? code.lang : language;

      if (!codeText) return '';

      const validLanguage = codeLang && hljs.getLanguage(codeLang) ? codeLang : 'plaintext';
      const highlightedCode = hljs.highlight(codeText, { language: validLanguage }).value;

      return `
        <div class="code-block-container">
          <button class="copy-button" data-code="${encodeURIComponent(codeText)}">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
          </button>
          <pre><code class="hljs language-${validLanguage}">${highlightedCode}</code></pre>
        </div>
      `;
    };

    return `
      <div class="article-container">
        <div class="article-title">${title}</div>
        <div class="article-metadata">
          <pre>${metadata}</pre>
        </div>
        <div class="article-body">
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

        // Setup copy buttons after content is rendered
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
    document.querySelectorAll('.copy-button').forEach(button => {
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
    <div className="article-overlay">
      <button className="close-button" onClick={handleClose}>×</button>
      <div className="article-content"
           dangerouslySetInnerHTML={{ __html: articleContent }} />
    </div>
  );
}

export default Article;