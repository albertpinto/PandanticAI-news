import React, { useState } from 'react';
import axios from 'axios';

const HelloWorldGenerator = () => {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleInputChange = (e) => {
    setQuestion(e.target.value);
    setError(null); // Clear any previous errors
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!question.trim()) {
      setError('Please enter a question');
      return;
    }
    
    setIsLoading(true);
    setAnswer('');
    setError(null);

    try {
      // Using GET endpoint with query parameter
      const response = await axios.get(`http://localhost:8002/ask`, {
        params: { question: question.trim() }
      });

      // Check if we got a valid response with an answer
      if (response.data && response.data.answer) {
        setAnswer(response.data.answer);
      } else {
        throw new Error('Invalid response format from server');
      }
    } catch (error) {
      console.error('Error asking question:', error);
      
      // Display more specific error message based on response if available
      if (error.response) {
        // The server responded with a status code outside the 2xx range
        const serverError = error.response.data?.error || `Server error: ${error.response.status}`;
        setError(serverError);
      } else if (error.request) {
        // The request was made but no response was received
        setError('No response from server. Please check if the backend is running.');
      } else {
        // Something happened in setting up the request
        setError(error.message || 'Failed to get an answer. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full h-screen max-h-screen p-4 bg-gray-100">
      <div className="container mx-auto h-full max-w-4xl border border-gray-300 rounded-lg shadow-lg flex flex-col bg-white">
        {/* Header */}
        <div className="flex items-center p-6 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-blue-800">
          <h1 className="text-2xl font-bold text-white">Hello World Question Box</h1>
        </div>

        {/* Question Input Section */}
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="text"
              name="question"
              placeholder="Ask a question..."
              value={question}
              onChange={handleInputChange}
              className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !question}
              className="px-6 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Asking...' : 'Ask'}
            </button>
          </form>
        </div>

        {/* Answer Display Section */}
        <div className="flex-1 p-6 overflow-y-auto">
          {isLoading && <p className="text-gray-600">Loading...</p>}
          {error && (
            <div className="p-4 mt-4 rounded border border-red-300 bg-red-50">
              <p className="text-red-700">{error}</p>
            </div>
          )}
          {answer && (
            <div className="p-4 mt-4 rounded border border-blue-300 bg-blue-50">
              <p className="text-blue-800">{answer}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HelloWorldGenerator;