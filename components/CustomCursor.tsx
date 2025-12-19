import React from 'react';

const CustomCursor: React.FC = React.memo(() => {
  // A cleaner, sharper SVG cursor.
  // We remove the heavy drop shadow from the SVG itself to keep it crisp ("Luxury").
  const cursorSvg = `
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 4L11 21L13.5 13.5L21 11L4 4Z" fill="black" stroke="white" stroke-width="1"/>
    </svg>
  `;

  const cursorUrl = `data:image/svg+xml;base64,${btoa(cursorSvg)}`;

  return (
    <style>{`
      /* Enforce custom cursor on EVERYTHING */
      * {
        cursor: url('${cursorUrl}') 4 4, auto !important;
      }
      
      html, body {
        cursor: url('${cursorUrl}') 4 4, auto !important;
        height: 100%;
        width: 100%;
      }

      /* Specific override for iframe to ensure it doesn't try to hide it */
      iframe {
        pointer-events: auto !important;
      }
    `}</style>
  );
});

export default CustomCursor;