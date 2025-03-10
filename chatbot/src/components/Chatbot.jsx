import React, { useState } from 'react';

const Chatbot = () => {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [model, setModel] = useState("groq"); // Default model
  const serverUrl = "http://localhost:8000";
  const [isLoading, setIsLoading] = useState(false);
  const apiKey = process.env.REACT_APP_API_KEY; // Read API key from environment variable
  const prompt = "callme";  // Changed to const since we're not modifying it

  const handleSend = async () => {
    const trimmedInput = inputValue.trim();
    if (!trimmedInput) return;

    setIsLoading(true);
    const userMessage = { text: trimmedInput, type: 'user' };
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');

    try {
      const requestBody = {
        query: trimmedInput,
        config: {
          model: model,
          temperature: 0.7, // Example temperature, replace with actual value if needed
          api_key: apiKey, // Include the API key in the request
        }
      };

      const response = await fetch(`${serverUrl}/decompose`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Include other headers if necessary, like an API key header
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      // Assuming the response contains a list of decomposed questions
      data.decomposed_questions.forEach(decomposedQuestion => {
        setMessages(prev => [...prev, {
          text: decomposedQuestion.question,
          type: 'bot'
        }]);
      });
    } catch (error) {
      setMessages(prev => [...prev, {
        text: `Error: ${error.message}`,
        type: 'error'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendQuery = async (query) => {
    try {
      // Clear the messages before sending the query
      setMessages([{ text: query, type: 'bot' }]);

      const response = await fetch(`http://localhost:8001/process/${encodeURIComponent(query)}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      setMessages(prev => [...prev, {
        text: data.output,
        type: 'bot'
      }]);
    } catch (error) {
      setMessages(prev => [...prev, {
        text: `Error: ${error.message}`,
        type: 'error'
      }]);
    }
  };
  
  const handleClear = () => {
    setMessages([]);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="w-full h-screen max-h-screen p-4 bg-gray-100">
      <div className="container mx-auto h-full max-w-6xl border border-gray-300 rounded-lg shadow-lg flex flex-col bg-white">
        <div className="flex items-center p-6 border-b border-gray-200 bg-gradient-to-r from-red-600 to-red-800">
          <h1 className="text-lg font-bold text-white">News Room - Powered by AI</h1>
        </div>
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-red-600 to-red-800">
          <div className="flex flex-col md:flex-row items-center gap-3">
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full md:w-48 p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
            >
              <option value="gpt-4-turbo">GPT-4 Turbo</option>
              <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
              <option value="groq">Groq</option>
            </select>
            <div className="flex-1 flex flex-col md:flex-row gap-3 w-full">
              <input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your message..."
                disabled={isLoading}
                className="flex-1 p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleClear}
                  disabled={isLoading || messages.length === 0}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors disabled:opacity-50"
                >
                  Clear
                </button>
                <button
                  onClick={handleSend}
                  disabled={isLoading || !inputValue.trim()}
                  className="px-6 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-w-[100px]"
                >
                  {isLoading ? 'Sending...' : 'Send'}
                </button>
              </div>
            </div>
          </div>
        </div>
        <div className="flex-1 p-6 overflow-y-auto space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`max-w-[80%] p-4 rounded-lg ${
                message.type === 'user'
                  ? 'ml-auto bg-white text-gray-800'
                  : message.type === 'error'
                  ? 'bg-red-100 text-red-800'
                  : 'bg-white border border-gray-200 shadow-sm cursor-pointer'
              }`}
              onClick={() => message.type === 'bot' && handleSendQuery(message.text)}
            >
              {message.text}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Chatbot;