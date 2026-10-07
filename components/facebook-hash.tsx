"use client";

import { useEffect } from "react";

// Facebook adds "#_=_" to the address it sends back to, and it rides along through our redirects.
export function FacebookHash() {
  useEffect(() => {
    if (window.location.hash === "#_=_") {
      window.history.replaceState(window.history.state, "", window.location.pathname + window.location.search);
    }
  }, []);
  return null;
}
