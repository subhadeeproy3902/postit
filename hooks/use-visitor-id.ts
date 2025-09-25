'use client';

import { useEffect, useState } from 'react';
import FingerprintJS from '@fingerprintjs/fingerprintjs';

const VISITOR_ID_KEY = 'postit_visitor_id';

export function useVisitorId() {
  const [visitorId, setVisitorId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Only run on client side
    const initFingerprint = async () => {
      try {
        // First check if we have a stored visitor ID
        const storedId = localStorage.getItem(VISITOR_ID_KEY);

        if (storedId) {
          setVisitorId(storedId);
          setIsLoading(false);
          return;
        }

        // If no stored ID, generate a new one using FingerprintJS
        const fp = await FingerprintJS.load();
        const result = await fp.get();
        // Unique persistent visitor identifier
        const visitorId = result.visitorId;
        // Store (or send to backend) this value
        console.log(visitorId);
        localStorage.setItem(VISITOR_ID_KEY, visitorId);
        setVisitorId(visitorId);
      } catch (error) {
        console.error('Error initializing fingerprint:', error);
        // Fallback to a random ID if FingerprintJS fails
        const fallbackId = `fallback_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
        localStorage.setItem(VISITOR_ID_KEY, fallbackId);
        setVisitorId(fallbackId);
      } finally {
        setIsLoading(false);
      }
    };

    initFingerprint();
  }, []);

  return { visitorId, isLoading };
}
