import React, { useState } from "react";
import { Link } from "react-router-dom";
import PropTypes from "prop-types";
import CatLogo from "./CatLogo"; // Add this import

function Navbar({ title }) {
  const [isMenuOpen, setMenuOpen] = useState(false);

  const toggleMenu = () => {
    setMenuOpen(!isMenuOpen);
  };

  return (
    <nav className="navbar h-14 mb-12 shadow-lg bg-gradient-to-r from-red-600 to-red-800 text-white">
      <div className="container mx-auto flex justify-between items-center px-4">
        <div className="flex items-center">
          <CatLogo className="mr-2" size={32} /> {/* Replace MdBuildCircle with CatLogo */}
          <Link to="/" className="text-lg font-bold align-middle">
            {title}
          </Link>
        </div>

        {/* Rest of your navbar code remains the same */}
        <div className="hidden md:flex">
          <Link to="/" className="btn btn-ghost btn-sm rounded-btn mr-4">
            News
          </Link>
          <Link to="/about" className="btn btn-ghost btn-sm rounded-btn">
            About
          </Link>
        </div>

        <div className="md:hidden">
          <button className="btn btn-ghost btn-sm rounded-btn" onClick={toggleMenu}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
        </div>
      </div>

      <div className={`md:hidden ${isMenuOpen ? "block" : "hidden"} bg-gradient-to-r from-red-600 to-red-800`}>
        <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
          <Link
            to="/chat"
            className="block px-3 py-2 rounded-md text-base font-medium text-white bg-red-700 hover:bg-red-600"
          >
            News
          </Link>
          <Link
            to="/about"
            className="block px-3 py-2 rounded-md text-base font-medium text-white bg-red-700 hover:bg-red-600"
          >
            About
          </Link>
        </div>
      </div>
    </nav>
  );
}

Navbar.defaultProps = {
  title: "AI Assistant!",
};

Navbar.propTypes = {
  title: PropTypes.string,
};

export default Navbar;