import React from 'react';

const CatLogo = ({ className = '', size = 40 }) => {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={className}
    >
      {/* Face shape */}
      <path d="M20 30 C20 20, 80 20, 80 30 C95 45, 95 75, 50 90 C5 75, 5 45, 20 30" fill="black"/>
      
      {/* White patch */}
      <path d="M40 60 C45 70, 55 70, 60 60 C60 75, 40 75, 40 60" fill="white"/>
      
      {/* Eyes */}
      <circle cx="35" cy="45" r="8" fill="#FFD700"/>
      <circle cx="65" cy="45" r="8" fill="#FFD700"/>
      <circle cx="35" cy="45" r="4" fill="black"/>
      <circle cx="65" cy="45" r="4" fill="black"/>
      
      {/* Ears */}
      <path d="M25 25 L20 10 L35 20 Z" fill="black"/>
      <path d="M75 25 L80 10 L65 20 Z" fill="black"/>
      
      {/* Whiskers */}
      <g stroke="white" strokeWidth="1">
        <line x1="25" y1="55" x2="10" y2="50"/>
        <line x1="25" y1="58" x2="10" y2="58"/>
        <line x1="25" y1="61" x2="10" y2="66"/>
        
        <line x1="75" y1="55" x2="90" y2="50"/>
        <line x1="75" y1="58" x2="90" y2="58"/>
        <line x1="75" y1="61" x2="90" y2="66"/>
      </g>
    </svg>
  );
};

export default CatLogo; 