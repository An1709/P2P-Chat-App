// import { defineConfig } from 'vite';
// import react from '@vitejs/plugin-react';
// import fs from 'fs';

// export default defineConfig({
//   plugins: [react()],
//   server: {
//     host: '0.0.0.0', // Listen on all network interfaces
//     port: 5173,
//     https: {
//       key: fs.readFileSync('./localhost-key.pem'),
//       cert: fs.readFileSync('./localhost.pem'),
//     },
//   },
// });



// // Given by Gemini AI
// import { defineConfig } from 'vite';
// import react from '@vitejs/plugin-react';
// import fs from 'fs';
// // Make sure you have vite-plugin-node-polyfills in your package.json devDependencies
// import { nodePolyfills } from 'vite-plugin-node-polyfills' 

// export default defineConfig(({ command }) => {
//   const config = {
//     plugins: [
//       react(),
//       // nodePolyfills() // Uncomment this if you installed the polyfill plugin
//     ],
//   };

//   // Conditionally add the HTTPS server config ONLY for local development
//   if (command === 'serve') {
//     config.server = {
//       host: '0.0.0.0',
//       port: 5173,
//       https: {
//         key: fs.readFileSync('./localhost-key.pem'),
//         cert: fs.readFileSync('./localhost.pem'),
//       },
//     };
//   }

//   return config;
// });




// client/vite.config.js - NEW CODE
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills'; // Import the polyfill
import fs from 'fs';

export default defineConfig(({ command }) => {
  const config = {
    plugins: [
      react(),
      nodePolyfills({
        // Enable the Buffer polyfill globally
        globals: {
          Buffer: true,
        },
      }),
    ],
  };

  // This conditional logic you added is perfect and stays the same
  if (command === 'serve') {
    try {
      config.server = {
        host: '0.0.0.0',
        port: 5173,
        https: {
          key: fs.readFileSync('./localhost-key.pem'),
          cert: fs.readFileSync('./localhost.pem'),
        },
      };
    } catch (e) {
      console.warn('HTTPS certs not found, running in HTTP mode. WebRTC may fail.');
    }
  }

  return config;
});