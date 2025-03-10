import './App.css';
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import About from "./pages/About";
import NotFound from "./pages/NotFound";
import Navbar from "./components/layout/Navbar";
import Footer from "./components/layout/Footer";
import Chatbot from './components/Chatbot';
import PoemGenerator from './components/PoemGenerator';
import SourcesGenerator from './components/SourcesGenerator';
import HelloWorldGenerator from './components/HelloWorldGenerator';
import NewsSearcher from './components/NewsSearcher';
import NewsGenerator from './components/NewsGenerator';
import NewsAggregator from './components/NewsAggregator';

function App() {
  return (
    <Router>
      <Navbar />
      <main className="container mx-auto px-3 pb-12">
        <Routes>
          <Route path="/" element={<NewsAggregator/>} />
          <Route path="/poem" element={<PoemGenerator />} />
          <Route path="/chat" element={<Chatbot />} />
          <Route path="/sources" element={<SourcesGenerator />} />
          <Route path="/hello" element={<HelloWorldGenerator />} />
          <Route path="/news" element={<NewsSearcher />} />
          <Route path="/news-aggregator" element={<NewsAggregator />} />
          <Route path="/notfound" element={<NotFound />} />
          <Route path="/about" element={<About />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
    </Router>
  );
}

export default App;
