import { Navigate } from 'react-router-dom';

// Beholdes for bakoverkompatibilitet: gamle bokmerker /About
// omdirigeres til den nye /Side/<slug>-ruten.
export default function About() {
  return <Navigate to="/Side/om-appen" replace />;
}
