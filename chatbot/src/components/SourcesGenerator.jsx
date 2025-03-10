import React, { useState } from 'react';

// Separate SourceCard component with better error handling and URL validation
const SourceCard = ({ source }) => {
  const isValidUrl = (url) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  // Format URL for display (remove http/https and trailing slashes)
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
              className="inline-block px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
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

const SourcesGenerator = () => {
  const [sourcesData, setSourcesData] = useState(null);
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
    setError(null); // Clear any previous errors
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setSourcesData(null);
    setError(null);

    try {
      const response = await fetch('http://localhost:8002/sources', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: formData.topic || "Show me general news sources"
        })
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle specific error messages from the server
        throw new Error(data.error || `Server error (${response.status}). Please try again.`);
      }
      
      // Validate the response data
      if (!data.answer || !data.answer.sources) {
        throw new Error('No sources found. Please try a different topic.');
      }

      if (!Array.isArray(data.answer.sources) || data.answer.sources.length === 0) {
        throw new Error('No sources available for this topic. Please try a different search.');
      }

      setSourcesData({
        topic: formData.topic || "General News",
        created_at: new Date().toISOString(),
        sources: data.answer.sources
      });
    } catch (error) {
      console.error('Error generating sources:', error);
      setError(error.message || 'Failed to generate sources. Please try again.');
      setSourcesData(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Loading spinner component
  const LoadingSpinner = () => (
    <div className="flex flex-col items-center justify-center p-8 space-y-4">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-800"></div>
      <p className="text-amber-800">Generating sources...</p>
    </div>
  );

  // Error message component
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
          <h1 className="text-2xl font-bold text-white">AI News Sources Generator</h1>
        </div>

        {/* Controls Section */}
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-red-600 to-red-800">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <select
                name="language"
                value={formData.language}
                onChange={handleInputChange}
                className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
                disabled={isLoading}
              >
                <option value="en">English</option>
                <option value="hi">Hindi</option>
                <option value="kn">Kannada</option>
                <option value="kok">Konkani</option>
                <option value="bn">Bengali</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
              </select>
              
              <input
                type="text"
                name="topic"
                placeholder="Enter topic (optional)"
                value={formData.topic}
                onChange={handleInputChange}
                className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
                disabled={isLoading}
              />
              
              <button
                type="submit"
                disabled={isLoading}
                className="px-6 py-2 bg-red-900 hover:bg-red-800 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {isLoading ? 'Generating...' : 'Generate Sources'}
              </button>
            </div>
          </form>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-6 overflow-y-auto">
          {isLoading && <LoadingSpinner />}
          
          {error && <ErrorMessage message={error} />}
          
          {sourcesData && !error && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-serif text-amber-900">
                  Sources for {sourcesData.topic || "General News"}
                </h2>
                <div className="text-sm text-amber-700">
                  Generated on {new Date(sourcesData.created_at).toLocaleString()}
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {sourcesData.sources.length > 0 ? (
                  sourcesData.sources.map((source, index) => (
                    <SourceCard key={index} source={source} />
                  ))
                ) : (
                  <div className="col-span-full text-center text-amber-800">
                    No sources available
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

export default SourcesGenerator;
