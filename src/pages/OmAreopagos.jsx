import { Navigate } from 'react-router-dom';

// Omdirigerer til den generiske /Side/<slug>-ruten.
export default function OmAreopagos() {
  return <Navigate to="/Side/om-areopagos" replace />;
}
