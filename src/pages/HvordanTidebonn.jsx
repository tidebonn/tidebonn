import { Navigate } from 'react-router-dom';

// Omdirigerer til den generiske /Side/<slug>-ruten.
export default function HvordanTidebonn() {
  return <Navigate to="/Side/hvordan-tidebonn" replace />;
}
