import { registerHooks } from 'node:module';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import ts from 'typescript';

const root = new URL('../../', import.meta.url);
registerHooks({
  resolve(specifier, context, nextResolve) {
    const candidate = specifier.startsWith('@/') ? new URL(specifier.slice(2), root)
      : specifier.startsWith('.') && context.parentURL ? new URL(specifier, context.parentURL) : null;
    if (candidate?.protocol === 'file:') {
      for (const suffix of ['', '.ts', '/index.ts']) {
        const path = fileURLToPath(candidate) + suffix;
        if (path.endsWith('.ts') && existsSync(path)) return { url: pathToFileURL(path).href, shortCircuit: true };
      }
    }
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (url.endsWith('.ts')) return {
      format: 'module', shortCircuit: true,
      source: ts.transpileModule(readFileSync(new URL(url), 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
      }).outputText,
    };
    return nextLoad(url, context);
  },
});
