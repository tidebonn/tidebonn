import { Navigate } from 'react-router-dom';

// Beholdes for bakoverkompatibilitet: gamle bokmerker /AboutPrayer
// omdirigeres til den nye /Side/<slug>-ruten.
export default function AboutPrayer() {
  return <Navigate to="/Side/hva-er-tidebonn" replace />;
}
