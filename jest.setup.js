import '@testing-library/jest-dom'

// Load environment variables for testing
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://gbymheksmnenuranuvjr.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieW1oZWtzbW5lbnVyYW51dmpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk1OTY1MDksImV4cCI6MjA3NTE3MjUwOX0.SSbPkXH5wHjAz7L6uBT8s4NzfXcwHw4wHDax0BoB2ZA';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieW1oZWtzbW5lbnVyYW51dmpyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTU5NjUwOSwiZXhwIjoyMDc1MTcyNTA5fQ.7bZJDdaPWu90j3KIoaQCYF_p6GeDC6Ph5jxgbs0G4Ew';
process.env.NYC_TAX_RATE = '0.08875';

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock fetch for tests
global.fetch = jest.fn();

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords() { return []; }
  unobserve() {}
};
