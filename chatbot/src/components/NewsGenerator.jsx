import React, { useState } from 'react';

const NewsViewer = ({ news, metadata }) => {
  return (
    <div className="max-w-3xl mx-auto bg-gradient-to-b from-amber-50 to-amber-100 rounded-lg shadow-xl p-8 border border-amber-300">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="inline-block">
          <h3 className="font-serif text-2xl text-amber-900 font-semibold relative">
            <span className="absolute -left-6 top-1/2 transform -translate-y-1/2 text-amber-700">❦</span>
            {metadata.topic || "Breaking News"}
            <span className="absolute -right-6 top-1/2 transform -translate-y-1/2 text-amber-700">❦</span>
          </h3>
          <div className="h-1 bg-gradient-to-r from-transparent via-amber-600 to-transparent mt-2"></div>
        </div>
      </div>
      
      {/* Main content */}
      <div className="relative bg-amber-50/80 rounded-lg p-6 shadow-inner border border-amber-200 min-h-[300px] max-h-[500px] overflow-y-auto">
        <div className="absolute top-3 left-3 text-amber-700/30 text-xl">❧</div>
        <div className="absolute top-3 right-3 text-amber-700/30 text-xl">❧</div>
        <div className="absolute bottom-3 left-3 text-amber-700/30 text-xl">❧</div>
        <div className="absolute bottom-3 right-3 text-amber-700/30 text-xl">❧</div>
        
        <div className="relative px-8 py-4">
          <div className="font-serif text-lg leading-relaxed text-amber-900">
            {news}
          </div>
        </div>
      </div>
      
      {/* Metadata footer */}
      <div className="mt-6 pt-4 border-t border-amber-300 flex justify-between items-center">
        <div className="flex items-center space-x-2 text-sm text-amber-800">
          <span className="px-3 py-1 bg-amber-200 rounded-full">{new Date(metadata.created_at).toLocaleDateString()}</span>
          {metadata.language && (
            <span className="px-3 py-1 bg-amber-200 rounded-full">
              {metadata.language.toUpperCase()}
            </span>
          )}
        </div>
        <div className="flex items-center space-x-2 text-sm text-amber-800">
          <span className="px-3 py-1 bg-amber-200 rounded-full">{metadata.sentence_count} sentences</span>
          {metadata.topic && <span className="px-3 py-1 bg-amber-200 rounded-full">{metadata.topic}</span>}
        </div>
      </div>

      {/* Decorative footer */}
      <div className="mt-4 text-center text-amber-700">
        <span className="text-xl">❦ ❦ ❦</span>
      </div>
    </div>
  );
};

const NewsGenerator = () => {
  const [newsData, setNewsData] = useState(null);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    language: 'en',
    topic: '',
    format: 'txt'
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setNewsData(null);
    setPdfUrl(null);

    try {
      const response = await fetch('http://localhost:8001/generate-news', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      if (formData.format === 'pdf') {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        setPdfUrl(url);
      } else {
        const data = await response.json();
        setNewsData(data);
      }
    } catch (error) {
      console.error('Error generating news:', error);
      setNewsData({ error: 'Failed to generate news. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full h-screen max-h-screen p-4 bg-gray-100">
      <div className="container mx-auto h-full max-w-6xl border border-gray-300 rounded-lg shadow-lg flex flex-col bg-white">
        {/* Header */}
        <div className="flex items-center p-6 border-b border-gray-200 bg-gradient-to-r from-red-600 to-red-800">
          <h1 className="text-lg font-bold text-white">AI News Generator</h1>
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
                placeholder="Enter news topic (optional)"
                value={formData.topic}
                onChange={handleInputChange}
                className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
              />
              
              <div className="flex gap-2">
                <select
                  name="format"
                  value={formData.format}
                  onChange={handleInputChange}
                  className="flex-1 p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
                >
                  <option value="txt">Text</option>
                  <option value="pdf">PDF</option>
                </select>
                
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-6 py-2 bg-red-900 hover:bg-red-800 text-white rounded-lg transition-colors disabled:opacity-50 min-w-[120px]"
                >
                  {isLoading ? 'Generating...' : 'Generate'}
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-6 overflow-y-auto">
          {isLoading && (
            <div className="flex justify-center items-center p-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-800"></div>
            </div>
          )}
          
          {pdfUrl && (
            <div className="w-full bg-white rounded-lg shadow-lg p-8 border border-gray-200">
              <iframe
                src={pdfUrl}
                className="w-full h-[800px] rounded-lg bg-white"
                title="News PDF"
              />
            </div>
          )}
          
          {newsData && !newsData.error && !pdfUrl && (
            <NewsViewer 
              news={newsData.news} 
              metadata={{
                created_at: newsData.created_at,
                sentence_count: newsData.sentence_count,
                language: newsData.language,
                topic: newsData.topic
              }}
            />
          )}
          
          {newsData?.error && (
            <div className="bg-red-100 text-red-800 p-4 rounded-lg">
              {newsData.error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NewsGenerator;
