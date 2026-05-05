#!/usr/bin/env node

// Core Acrylics Database Fix Script - Highlander Method (CommonJS wrapper)
// This just imports and runs the existing ES-module script using dynamic import.

import('file://' + process.cwd().replace(/\\/g, '/') + '/scripts/fix_core_acrylics.js')
  .then(() => {
    // Script fix_core_acrylics.js runs fixCoreAcrylics() on load
  })
  .catch((err) => {
    console.error('Failed to run fix_core_acrylics.js via CJS wrapper:', err);
    process.exit(1);
  });

