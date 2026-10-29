import React from 'react';
import GoogleProjectsManager from './GoogleProjectsManager';

/**
 * AccountsManager (Aliased to GoogleProjectsManager)
 * Ensures 100% compatibility with any existing imports while providing the
 * full 5-Project Google Cloud Console rotation dashboard with zero modals.
 */
export default function AccountsManager(props) {
  return <GoogleProjectsManager {...props} />;
}
