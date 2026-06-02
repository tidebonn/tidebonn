import { Navigate } from 'react-router-dom';

// Omdirigerer til den generiske /Side/<slug>-ruten.
export default function HvaErTidebonn() {
  return <Navigate to="/Side/hva-er-tidebonn" replace />;
}
