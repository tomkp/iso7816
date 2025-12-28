# iso7816 Repository Review & Modernization Guide

**Date:** December 2025
**Current Version:** 1.0.20
**Review Scope:** Full repository audit with 2025 best practices recommendations

---

## Executive Summary

This document provides a comprehensive review of the `iso7816` smartcard library with actionable recommendations for modernizing to 2025 JavaScript/Node.js standards. The library provides a solid foundation for ISO 7816 smartcard communication but requires significant updates to its tooling, dependencies, and development practices.

### Priority Matrix

| Priority | Area | Impact |
|----------|------|--------|
| Critical | Replace deprecated `card-reader` with `smartcard` | Breaking without fix |
| Critical | Migrate from Babel 6 to native ES Modules | Security/Compatibility |
| High | Add TypeScript support | Developer experience |
| High | Add testing infrastructure | Code quality |
| Medium | Modernize Node.js APIs | Deprecation warnings |
| Medium | Add CI/CD pipeline | Release quality |
| Low | Documentation improvements | Adoption |

---

## 1. Critical: Dependency Updates

### 1.1 Replace Deprecated `card-reader` with `smartcard`

**Current state:** The `card-reader` package is deprecated.

**Required changes:**

```json
// package.json - Before
"dependencies": {
  "card-reader": "^1.0.3"
}

// package.json - After
"dependencies": {
  "smartcard": "^latest"
}
```

**Code migration required in:**
- `src/iso7816-application.js` - Update import and API calls
- `demo/iso7816-demo.js` - Update example code
- `README.md` - Update documentation examples

The `smartcard` package has a different API, so a careful migration is needed. Key differences to handle:
- Event names may differ
- Method signatures for issuing commands
- Device/reader management patterns

### 1.2 Remove Unused Dependency

The `apdu` package is listed as a dependency but **never imported or used** in the codebase. Remove it:

```json
// Remove from dependencies
"apdu": "^0.0.3"  // DELETE THIS LINE
```

### 1.3 Evaluate `hexify` Usage

`hexify` is only used in `command-apdu.js:65` in `toString()`, and there's actually a bug - it references `bytes` instead of `this.bytes`. Consider:
- Using native `Buffer.toString('hex')` which is built into Node.js
- Or fix the bug and keep `hexify` if extended hex formatting is needed

---

## 2. Critical: Build System Modernization

### 2.1 Migrate from Babel to Native ES Modules

**Current state:** Using Babel 6 (released 2015, now deprecated) with `babel-preset-es2015`.

**Recommendation:** Node.js 14+ has native ES Module support. In 2025, there's no need for Babel transpilation for ES6 features.

**Option A: Pure ES Modules (Recommended)**

```json
// package.json
{
  "type": "module",
  "main": "src/iso7816-application.js",
  "exports": {
    ".": "./src/iso7816-application.js"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

Update source files to use proper ES module syntax:

```javascript
// Before (mixed CommonJS/ES6)
import hexify from "hexify";
module.exports = create;

// After (pure ESM)
import hexify from "hexify";
export default create;
export { CommandApdu, ins };
```

**Option B: Dual CJS/ESM Support**

If backwards compatibility is needed:

```json
{
  "main": "./dist/cjs/index.js",
  "module": "./dist/esm/index.js",
  "exports": {
    ".": {
      "import": "./dist/esm/index.js",
      "require": "./dist/cjs/index.js"
    }
  }
}
```

### 2.2 Remove Babel Dependencies

```json
// Remove from devDependencies
"babel-cli": "^6.6.5",        // DELETE
"babel-preset-es2015": "^6.6.0" // DELETE
```

Remove `.babelrc` file entirely.

### 2.3 Update Scripts

```json
"scripts": {
  "test": "node --test",
  "lint": "eslint src/",
  "typecheck": "tsc --noEmit",
  "prepublishOnly": "npm test && npm run typecheck"
}
```

---

## 3. High Priority: Add TypeScript Support

### 3.1 Option A: Full TypeScript Migration

Convert source files to TypeScript for full type safety:

```
src/
├── command-apdu.ts
├── response-apdu.ts
├── iso7816-application.ts
└── types.ts
```

**tsconfig.json:**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "declaration": true,
    "declarationMap": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### 3.2 Option B: JSDoc + Type Declarations (Lighter Touch)

Keep JavaScript but add type declarations:

**src/types.d.ts:**

```typescript
export interface CommandApduOptions {
  cla: number;
  ins: number;
  p1: number;
  p2: number;
  data?: number[];
  le?: number;
  size?: number;
}

export interface CommandApdu {
  bytes: number[];
  toString(): string;
  toByteArray(): number[];
  toBuffer(): Buffer;
  setLe(le: number): void;
}

export interface ResponseApdu {
  buffer: Buffer;
  data: string;
  getStatus(): { code: string; meaning: string };
  getStatusCode(): string;
  isOk(): boolean;
  hasMoreBytesAvailable(): boolean;
  numberOfBytesAvailable(): number;
  isWrongLength(): boolean;
  correctLength(): number;
  toString(): string;
}

export interface Iso7816Instructions {
  APPEND_RECORD: 0xE2;
  ENVELOPE: 0xC2;
  ERASE_BINARY: 0x0E;
  EXTERNAL_AUTHENTICATE: 0x82;
  GET_CHALLENGE: 0x84;
  GET_DATA: 0xCA;
  GET_RESPONSE: 0xC0;
  INTERNAL_AUTHENTICATE: 0x88;
  MANAGE_CHANNEL: 0x70;
  PUT_DATA: 0xDA;
  READ_BINARY: 0xB0;
  READ_RECORD: 0xB2;
  SELECT_FILE: 0xA4;
  UPDATE_BINARY: 0xD6;
  UPDATE_RECORD: 0xDC;
  VERIFY: 0x20;
  WRITE_BINARY: 0xD0;
  WRITE_RECORD: 0xD2;
}

declare function createIso7816(devices: any, cardReader: any): Iso7816;
export default createIso7816;
```

---

## 4. High Priority: Add Testing Infrastructure

### 4.1 Testing Framework

Use Node.js built-in test runner (Node 18+) or Vitest:

**Option A: Node.js Built-in Test Runner**

```javascript
// test/command-apdu.test.js
import { describe, it } from 'node:test';
import assert from 'node:assert';
import CommandApdu from '../src/command-apdu.js';

describe('CommandApdu', () => {
  describe('Case 1 - No data, no Le', () => {
    it('should create 4-byte command', () => {
      const apdu = CommandApdu({ cla: 0x00, ins: 0xA4, p1: 0x04, p2: 0x00 });
      const bytes = apdu.toByteArray();
      assert.strictEqual(bytes.length, 5); // CLA, INS, P1, P2, LE(0)
      assert.deepStrictEqual(bytes.slice(0, 4), [0x00, 0xA4, 0x04, 0x00]);
    });
  });

  describe('Case 3 - With data, no Le', () => {
    it('should include LC and data', () => {
      const data = [0x31, 0x50, 0x41, 0x59];
      const apdu = CommandApdu({ cla: 0x00, ins: 0xA4, p1: 0x04, p2: 0x00, data });
      const bytes = apdu.toByteArray();
      assert.strictEqual(bytes[4], data.length); // LC
      assert.deepStrictEqual(bytes.slice(5, 9), data);
    });
  });

  describe('toBuffer', () => {
    it('should return a Buffer instance', () => {
      const apdu = CommandApdu({ cla: 0x00, ins: 0xA4, p1: 0x04, p2: 0x00 });
      assert.ok(Buffer.isBuffer(apdu.toBuffer()));
    });
  });
});
```

**Option B: Vitest (if preferring a more feature-rich framework)**

```javascript
// vitest.config.js
export default {
  test: {
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      exclude: ['demo/**']
    }
  }
};
```

### 4.2 Suggested Test Structure

```
test/
├── unit/
│   ├── command-apdu.test.js
│   ├── response-apdu.test.js
│   └── iso7816-application.test.js
├── integration/
│   └── smartcard-mock.test.js
└── fixtures/
    └── sample-responses.js
```

---

## 5. Medium Priority: Code Quality Issues

### 5.1 Bug Fixes Required

**Bug 1: `command-apdu.js:65` - Undefined variable reference**

```javascript
// Current (BROKEN)
CommandApdu.prototype.toString = function() {
  return hexify.toHexString(bytes);  // 'bytes' is undefined!
};

// Fixed
CommandApdu.prototype.toString = function() {
  return hexify.toHexString(this.bytes);
};
```

**Bug 2: `command-apdu.js:73` - Deprecated Buffer constructor**

```javascript
// Current (DEPRECATED - security warning in Node.js)
CommandApdu.prototype.toBuffer = function() {
  return new Buffer(this.bytes);
};

// Fixed
CommandApdu.prototype.toBuffer = function() {
  return Buffer.from(this.bytes);
};
```

**Bug 3: `response-apdu.js:70-72` - Property shadows method**

```javascript
// Current (property 'buffer' shadows the buffer() method)
function ResponseApdu(buffer) {
  this.buffer = buffer;  // This property...
}
ResponseApdu.prototype.buffer = function() {  // ...shadows this method
  return this.buffer;
};

// Fixed - rename method to getBuffer()
ResponseApdu.prototype.getBuffer = function() {
  return this.buffer;
};
```

### 5.2 Use Modern JavaScript Patterns

**Convert prototype-based classes to ES6 classes:**

```javascript
// Before
function CommandApdu(obj) {
  this.bytes = [];
  // ...
}
CommandApdu.prototype.toBuffer = function() {
  return Buffer.from(this.bytes);
};

// After
class CommandApdu {
  #bytes = [];

  constructor(options) {
    // ...
  }

  toBuffer() {
    return Buffer.from(this.#bytes);
  }

  get bytes() {
    return [...this.#bytes]; // Return copy for immutability
  }
}
```

### 5.3 Use const/let Instead of var

The demo file still uses `var`. Update to `const`/`let`:

```javascript
// Before
var devices = require('card-reader');
var iso7816 = require('../lib/iso7816-application');

// After
import { Devices } from 'smartcard';
import iso7816 from '../src/iso7816-application.js';
```

---

## 6. Medium Priority: CI/CD Pipeline

### 6.1 GitHub Actions Workflow

**.github/workflows/ci.yml:**

```yaml
name: CI

on:
  push:
    branches: [master, main]
  pull_request:
    branches: [master, main]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18, 20, 22]

    steps:
      - uses: actions/checkout@v4

      - name: Use Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'

      - run: npm ci
      - run: npm test
      - run: npm run lint
      - run: npm run typecheck

  publish:
    needs: test
    if: github.ref == 'refs/heads/master' && github.event_name == 'push'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          registry-url: 'https://registry.npmjs.org'
      - run: npm ci
      - run: npm publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

### 6.2 Add Package Lock File

Generate and commit `package-lock.json` for reproducible builds:

```bash
npm install
git add package-lock.json
git commit -m "Add package-lock.json for reproducible builds"
```

---

## 7. Low Priority: Documentation Improvements

### 7.1 Update README.md

- Update example code to use `smartcard` instead of `card-reader`
- Add installation requirements (Node.js version, PC/SC drivers)
- Add API documentation section
- Add badges (npm version, CI status, license)
- Add TypeScript usage examples

### 7.2 Add CHANGELOG.md

Track version changes following [Keep a Changelog](https://keepachangelog.com/) format.

### 7.3 Add CONTRIBUTING.md

Document contribution guidelines, development setup, and code standards.

---

## 8. Updated package.json (Complete Example)

```json
{
  "name": "iso7816",
  "version": "2.0.0",
  "description": "ISO 7816 smartcard communication library",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  },
  "files": [
    "dist"
  ],
  "scripts": {
    "build": "tsc",
    "test": "node --test test/**/*.test.js",
    "test:coverage": "node --test --experimental-test-coverage test/**/*.test.js",
    "lint": "eslint src/",
    "lint:fix": "eslint src/ --fix",
    "typecheck": "tsc --noEmit",
    "prepublishOnly": "npm run build && npm test",
    "release": "npm run build && npm version patch && git push --follow-tags && npm publish"
  },
  "author": "tomkp <tom@tomkp.com>",
  "license": "MIT",
  "keywords": [
    "pcsc",
    "smartcard",
    "smart-card",
    "iso7816",
    "iso-7816",
    "chip-and-pin",
    "emv",
    "apdu"
  ],
  "repository": {
    "type": "git",
    "url": "git+https://github.com/tomkp/iso7816.git"
  },
  "bugs": {
    "url": "https://github.com/tomkp/iso7816/issues"
  },
  "homepage": "https://github.com/tomkp/iso7816#readme",
  "engines": {
    "node": ">=18.0.0"
  },
  "dependencies": {
    "smartcard": "^1.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "eslint": "^9.0.0",
    "typescript": "^5.4.0"
  }
}
```

---

## 9. Migration Checklist

### Phase 1: Critical Fixes
- [ ] Replace `card-reader` with `smartcard` dependency
- [ ] Update API calls to match `smartcard` package interface
- [ ] Fix `Buffer` deprecation warning (use `Buffer.from()`)
- [ ] Fix `bytes` undefined reference in `toString()`
- [ ] Remove unused `apdu` dependency

### Phase 2: Build System
- [ ] Remove Babel and `.babelrc`
- [ ] Add `"type": "module"` to package.json
- [ ] Convert all `module.exports` to `export`
- [ ] Convert all `require()` to `import`
- [ ] Update entry point in package.json

### Phase 3: Quality & Tooling
- [ ] Add TypeScript (full migration or .d.ts files)
- [ ] Add ESLint configuration
- [ ] Add test suite with Node.js test runner
- [ ] Add GitHub Actions CI workflow
- [ ] Generate and commit package-lock.json

### Phase 4: Documentation
- [ ] Update README with new API examples
- [ ] Add CHANGELOG.md
- [ ] Update demo code
- [ ] Add JSDoc comments to source files

---

## 10. Breaking Changes for v2.0.0

If implementing all recommendations, document these breaking changes:

1. **Minimum Node.js version:** 18.0.0 (was: unspecified)
2. **Module system:** ES Modules only (was: CommonJS)
3. **Dependency change:** `smartcard` replaces `card-reader`
4. **API change:** `ResponseApdu.buffer()` renamed to `ResponseApdu.getBuffer()`
5. **Export style:** Named exports available alongside default export

---

## Conclusion

The `iso7816` library has a solid architectural foundation but needs modernization to align with 2025 JavaScript/Node.js ecosystem standards. The most critical update is replacing the deprecated `card-reader` dependency with `smartcard`. Secondary priorities include removing the legacy Babel build system in favor of native ES modules and adding proper testing infrastructure.

Implementing these changes will result in:
- Smaller package size (no transpilation overhead)
- Better developer experience (TypeScript support)
- Improved reliability (testing, CI/CD)
- Modern compatibility (current Node.js LTS versions)
- Continued functionality (non-deprecated dependencies)
