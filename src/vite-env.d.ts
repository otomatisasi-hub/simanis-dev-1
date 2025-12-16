/// <reference types="vite/client" />

// Extend JSX untuk memastikan semua HTML elements recognized
declare namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: any;
    }
  }
  