export interface TrieVisualNode {
  char: string;
  isEnd: boolean;
  metadata?: string;
  children: Record<string, TrieVisualNode>;
}

export class TrieSimulator {
  root: TrieVisualNode;

  constructor() {
    this.root = { char: '^', isEnd: false, children: {} };
  }

  insert(word: string, metadata: string = '') {
    let curr = this.root;
    for (const char of word.toUpperCase()) {
      if (!curr.children[char]) {
        curr.children[char] = { char, isEnd: false, children: {} };
      }
      curr = curr.children[char];
    }
    curr.isEnd = true;
    curr.metadata = metadata || word;
  }

  autocomplete(prefix: string): { word: string; metadata: string; matchedPrefix: string }[] {
    const cleanPrefix = prefix.toUpperCase().trim();
    if (!cleanPrefix) return [];

    let curr = this.root;
    for (const char of cleanPrefix) {
      if (!curr.children[char]) return [];
      curr = curr.children[char];
    }

    const results: { word: string; metadata: string; matchedPrefix: string }[] = [];

    const dfs = (node: TrieVisualNode, currentWord: string) => {
      if (results.length >= 8) return;
      if (node.isEnd) {
        results.push({
          word: currentWord,
          metadata: node.metadata || currentWord,
          matchedPrefix: cleanPrefix
        });
      }
      for (const char of Object.keys(node.children).sort()) {
        dfs(node.children[char], currentWord + char);
      }
    };

    dfs(curr, cleanPrefix);
    return results;
  }

  // Get active path in the Trie for a given query string
  getActivePath(query: string): string[] {
    const path: string[] = ['^'];
    let curr = this.root;
    for (const char of query.toUpperCase().trim()) {
      if (curr.children[char]) {
        path.push(char);
        curr = curr.children[char];
      } else {
        break;
      }
    }
    return path;
  }
}
