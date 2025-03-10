import React, { useState } from 'react';

// Article card component
const ArticleCard = ({ article }) => {
  const formatDate = (dateString) => {
    if (!dateString) return 'Date not available';
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="bg-gradient-to-b from-amber-50 to-amber-100 rounded-lg shadow-md p-6 border border-amber-300 flex flex-col h-full">
      <h3 className="font-serif text-xl text-amber-900 font-semibold mb-2 line-clamp-2">
        {article.title}
      </h3>
      <div className="h-0.5 bg-gradient-to-r from-transparent via-amber-600 to-transparent mb-4"></div>
      
      {article.image_url && (
        <img 
          src={article.image_url} 
          alt={article.title}
          className="w-full h-48 object-cover rounded-lg mb-4"
          onError={(e) => e.target.style.display = 'none'}
        />
      )}

      <p className="text-amber-800 mb-4 flex-grow line-clamp-4">
        {article.summary || 'No summary available'}
      </p>

      <div className="mt-auto space-y-3">
        <div className="text-sm text-amber-700">
          <p>Category: {article.category}</p>
          <p>Published: {formatDate(article.publish_date)}</p>
          {article.authors.length > 0 && (
            <p>Authors: {article.authors.join(', ')}</p>
          )}
          <p className="text-sm break-words">
            Source: {article.source_domain}
          </p>
        </div>
        
        <a 
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
        >
          Read Article
        </a>
      </div>
    </div>
  );
};

const NewsSearcher = () => {
  const [articles, setArticles] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    url: '',
    query: '',
    method: 'combined'
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === 'url' && value && !value.startsWith('http')) {
      // Automatically prepend https:// if no protocol is specified
      setFormData(prev => ({
        ...prev,
        [name]: `https://${value.startsWith('www.') ? '' : 'www.'}${value}`
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setArticles(null);
    setError(null);

    try {
      const searchParams = new URLSearchParams({
        url: formData.url,
        query: formData.query,
        method: formData.method
      });

      const response = await fetch(`http://localhost:8000/search?${searchParams}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Server error (${response.status}). Please try again.`);
      }

      if (data.articles && Array.isArray(data.articles)) {
        setArticles(data);
      } else if (data.message) {
        setError(data.message);
      } else {
        throw new Error('Invalid response format from server');
      }
    } catch (error) {
      console.error('Error searching articles:', error);
      setError(error.message || 'Failed to search articles. Please try again.');
      setArticles(null);
    } finally {
      setIsLoading(false);
    }
  };

  const LoadingSpinner = () => (
    <div className="flex flex-col items-center justify-center p-8 space-y-4">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-800"></div>
      <p className="text-amber-800">Searching articles...</p>
    </div>
  );

  const ErrorMessage = ({ message }) => (
    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
      <strong className="font-bold">Error: </strong>
      <span className="block sm:inline">{message}</span>
    </div>
  );

  return (
    <div className="w-full h-screen max-h-screen p-4 bg-gray-100">
      <div className="container mx-auto h-full max-w-6xl border border-gray-300 rounded-lg shadow-lg flex flex-col bg-white">
        {/* Header */}
        <div className="flex items-center p-6 border-b border-gray-200 bg-gradient-to-r from-red-600 to-red-800">
          <h1 className="text-2xl font-bold text-white">Website Article Search</h1>
        </div>

        {/* Controls Section */}
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-red-600 to-red-800">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <input
                type="text"
                name="url"
                placeholder="Enter website URL (e.g., www.cnn.com)"
                value={formData.url}
                onChange={handleInputChange}
                className="col-span-2 w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
                required
                disabled={isLoading}
              />
              
              <input
                type="text"
                name="query"
                placeholder="Enter search query"
                value={formData.query}
                onChange={handleInputChange}
                className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
                required
                disabled={isLoading}
              />
              
              <select
                name="method"
                value={formData.method}
                onChange={handleInputChange}
                className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
                disabled={isLoading}
              >
                <option value="combined">Combined Search</option>
                <option value="direct_scrape">Direct Scrape</option>
                <option value="serper">Serper Search</option>
              </select>

              <button
                type="submit"
                disabled={isLoading}
                className="col-span-full px-6 py-2 bg-red-900 hover:bg-red-800 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {isLoading ? 'Searching...' : 'Search Articles'}
              </button>
            </div>
          </form>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-6 overflow-y-auto">
          {isLoading && <LoadingSpinner />}
          
          {error && <ErrorMessage message={error} />}
          
          {articles && !error && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-serif text-amber-900">
                  Found {articles.count} articles from {articles.domain}
                </h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {articles.articles.length > 0 ? (
                  articles.articles.map((article, index) => (
                    <ArticleCard key={index} article={article} />
                  ))
                ) : (
                  <div className="col-span-full text-center text-amber-800">
                    No articles found
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NewsSearcher; 