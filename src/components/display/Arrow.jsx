/**
 * Arrow Component
 * Displays an animated arrow between queue number and counter number
 */

import React from 'react';
import AppConfig from '../../config/AppConfig.js';
import './Arrow.css';

const Arrow = ({ 
  animated = true, 
  color = null, 
  size = 'medium',
  className = '' 
}) => {
  const arrowConfig = AppConfig.get('display.arrow') || {};
  const finalColor = color || arrowConfig.color || '#ffffff';
  const animationEnabled = animated && (arrowConfig.animated !== false);

  return (
    <div className={`arrow-container ${size} ${animationEnabled ? 'animated' : ''} ${className}`}>
      <svg 
        className="arrow-svg" 
        viewBox="0 0 100 20" 
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Arrow line */}
        <line 
          x1="10" 
          y1="10" 
          x2="75" 
          y2="10" 
          stroke={finalColor} 
          strokeWidth="3"
          className="arrow-line"
        />
        
        {/* Arrow head */}
        <polygon 
          points="75,5 90,10 75,15" 
          fill={finalColor}
          className="arrow-head"
        />
        
        {/* Animated pulse dot (optional) */}
        {animationEnabled && (
          <circle 
            cx="10" 
            cy="10" 
            r="2" 
            fill={finalColor}
            className="arrow-pulse"
          />
        )}
      </svg>
    </div>
  );
};

export default Arrow;