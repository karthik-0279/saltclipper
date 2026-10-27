import React from 'react';

/**
 * Toast Component
 * Displays temporary feedback notifications.
 */
export default function Toast({ message }) {
  if (!message) return null;

  return (
    <div className="toast-msg">
      {message}
    </div>
  );
}
