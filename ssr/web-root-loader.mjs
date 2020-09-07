// This is a loader hook for Node so it can handle imports from /web_modules/
// You only need this if you're using Snowpack
import path from 'path';

// @ts-ignore TS module is ESNext...
const __dirname = path.dirname(new URL(import.meta.url).pathname);

export function resolve(specifier, context, defaultResolve) {
  const rootIndex = specifier.indexOf('/web_modules');
  if (rootIndex !== -1) {
    const rootDir = `../serve${specifier.substring(rootIndex)}`;
    // Log: console.log('Translated', specifier, 'to', rootDir);
    return {
      url: `file://${path.resolve(__dirname, rootDir)}`,
    };
  }
  return defaultResolve(specifier, context, defaultResolve);
}
