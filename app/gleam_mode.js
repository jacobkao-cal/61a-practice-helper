// A small CodeMirror 5 mode for Gleam (CodeMirror has none): keywords, Capitalized names (types and constructors),
// strings, numbers, comments, @attributes and operators, with bracket-based indentation and // line comments.
// Uses the same token styles as the Python mode, so the Monokai theme colours both alike.
(function () {
  'use strict';
  if (!window.CodeMirror) return;
  const KEYWORDS = new Set(['as', 'assert', 'case', 'const', 'echo', 'else', 'fn', 'if', 'import', 'let', 'opaque',
    'panic', 'pub', 'todo', 'type', 'use']);
  const BUILTINS = new Set(['True', 'False', 'Nil', 'Ok', 'Error']);

  window.CodeMirror.defineMode('gleam', (config) => ({
    startState: () => ({ inString: false, depth: 0 }),
    token(stream, state) {
      if (state.inString) {
        while (!stream.eol()) {
          const c = stream.next();
          if (c === '\\') stream.next();
          else if (c === '"') { state.inString = false; break; }
        }
        return 'string';
      }
      if (stream.eatSpace()) return null;
      if (stream.match('//')) { stream.skipToEnd(); return 'comment'; }
      const ch = stream.peek();
      if (ch === '"') { stream.next(); state.inString = true; return this.token(stream, state); }
      if (/\d/.test(ch)) {
        stream.match(/^0[xob][0-9a-fA-F_]+/) || stream.match(/^\d[\d_]*(\.\d[\d_]*)?(e-?\d+)?/);
        return 'number';
      }
      if (ch === '@') { stream.next(); stream.match(/^\w+/); return 'meta'; }
      if (/[A-Z]/.test(ch)) {
        const word = stream.match(/^\w+/)[0];
        return BUILTINS.has(word) ? 'builtin' : 'variable-2';
      }
      if (/[a-z_]/.test(ch)) {
        const word = stream.match(/^\w+/)[0];
        if (KEYWORDS.has(word)) return 'keyword';
        if (stream.match(/^\s*\(/, false)) return 'def'; // a call or definition: name(
        return 'variable';
      }
      stream.next();
      if ('([{'.includes(ch)) { state.depth++; return 'bracket'; }
      if (')]}'.includes(ch)) { state.depth = Math.max(0, state.depth - 1); return 'bracket'; }
      if (ch === '#') return 'operator'; // #( starts a tuple
      if (/[-+*/%<>=!&|.^]/.test(ch)) { stream.eatWhile(/[-+*/%<>=!&|.^]/); return 'operator'; }
      return null;
    },
    indent(state, textAfter) {
      const closing = /^[)\]}]/.test(textAfter);
      return Math.max(0, state.depth - (closing ? 1 : 0)) * config.indentUnit;
    },
    electricChars: ')]}',
    lineComment: '//',
    closeBrackets: '()[]{}""',
  }));
  window.CodeMirror.defineMIME('text/x-gleam', 'gleam');
})();
