import React, { useState } from 'react';

// Source card component from SourcesGenerator
const SourceCard = ({ source }) => {
  const isValidUrl = (url) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const formatUrl = (url) => {
    try {
      const formatted = url.replace(/^https?:\/\//, '').replace(/\/$/, '');
      return formatted.length > 40 ? formatted.substring(0, 40) + '...' : formatted;
    } catch {
      return url;
    }
  };

  return (
    <div className="bg-gradient-to-b from-amber-50 to-amber-100 rounded-lg shadow-md p-6 border border-amber-300 flex flex-col h-full">
      <h3 className="font-serif text-xl text-amber-900 font-semibold mb-2 line-clamp-2">
        {source.name || 'Unnamed Source'}
      </h3>
      <div className="h-0.5 bg-gradient-to-r from-transparent via-amber-600 to-transparent mb-4"></div>
      <p className="text-amber-800 mb-4 flex-grow line-clamp-4">
        {source.description || 'No description available'}
      </p>
      <div className="mt-auto">
        {isValidUrl(source.url) ? (
          <>
            <p className="text-amber-700 text-sm mb-3 break-words">
              {formatUrl(source.url)}
            </p>
            <a 
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-4 py-2 bg-gradient-to-r from-red-700 to-red-900 text-white rounded-lg hover:from-red-800 hover:to-red-950 transition-all"
            >
              Visit Source
            </a>
          </>
        ) : (
          <p className="text-amber-700 italic">Invalid or missing URL</p>
        )}
      </div>
    </div>
  );
};

// Article card component from NewsSearcher
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
          {article.authors?.length > 0 && (
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
          className="inline-block px-4 py-2 bg-gradient-to-r from-red-700 to-red-900 text-white rounded-lg hover:from-red-800 hover:to-red-950 transition-all"
        >
          Read Article
        </a>
      </div>
    </div>
  );
};

const NewsAggregator = () => {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    language: 'en',
    topic: '',
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setData(null);
    setError(null);

    try {
      const response = await fetch(`http://localhost:8003/coordinate?question=${encodeURIComponent(formData.topic)}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `Server error (${response.status})`);
      }

      setData(result);
    } catch (error) {
      console.error('Error:', error);
      setError(error.message || 'Failed to fetch data');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full min-h-screen p-4 bg-gray-100">
      <div className="container mx-auto max-w-6xl border border-gray-300 rounded-lg shadow-lg flex flex-col bg-white">
        {/* Header */}
        <div className="flex items-center p-6 border-b border-gray-200 bg-gradient-to-r from-red-600 to-red-800">
          <h1 className="text-2xl font-bold text-white">AI News Aggregator</h1>
        </div>

        {/* Controls */}
        <div className="p-6 border-b border-gray-200 bg-white">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-12 gap-4">
              <select
                name="language"
                value={formData.language}
                onChange={handleInputChange}
                className="col-span-2 w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 bg-white shadow-sm"
                disabled={isLoading}
              >
                <option value="en">English</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
              </select>
              
              <input
                type="text"
                name="topic"
                placeholder="Enter topic or question"
                value={formData.topic}
                onChange={handleInputChange}
                className="col-span-8 w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 bg-white shadow-sm"
                required
                disabled={isLoading}
              />
              
              <button
                type="submit"
                disabled={isLoading}
                className="col-span-2 px-6 py-2 bg-gradient-to-r from-red-700 to-red-900 hover:from-red-800 hover:to-red-950 text-white rounded-lg transition-all disabled:opacity-50 shadow-md"
              >
                {isLoading ? 'Searching...' : 'Search News'}
              </button>
            </div>
          </form>
        </div>

        {/* Content */}
        <div className="flex-1 p-6">
          {isLoading && (
            <div className="flex justify-center items-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-800"></div>
            </div>
          )}

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
              <strong className="font-bold">Error: </strong>
              <span className="block sm:inline">{error}</span>
            </div>
          )}

          {data && (
            <div className="space-y-8">
              {/* Articles Section - Now First */}
              <div>
                <h2 className="text-2xl font-serif text-amber-900 mb-4">
                  Articles Found ({data.count})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {data.articles.map((article, index) => (
                    <ArticleCard key={index} article={article} />
                  ))}
                </div>
              </div>

              {/* Sources Section - Now Second */}
              <div>
                <h2 className="text-2xl font-serif text-amber-900 mb-4">News Sources</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {data.sources.map((source, index) => (
                    <SourceCard key={index} source={source} />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NewsAggregator; 