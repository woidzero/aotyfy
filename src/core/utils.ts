import { __CHANGELOG__ } from "../generated/extras";

export function valid(value: any): boolean {
  return value !== undefined && value !== null && value >= 0;
}

export function editDistance(str1: string, str2: string): number {
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();

  const len1 = s1.length;
  const len2 = s2.length;

  // early return for edge cases
  if (len1 === 0) return len2;
  if (len2 === 0) return len1;
  if (s1 === s2) return 0;

  // use single array for space optimization O(min(m,n))
  let prev: number[] = Array.from({ length: len2 + 1 }, (_, i) => i);

  // calculate edit distance
  for (let i = 1; i <= len1; i++) {
    const curr: number[] = Array.from({ length: len2 + 1 });
    curr[0] = i;

    for (let j = 1; j <= len2; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;

      curr[j] = Math.min(
        curr[j - 1] + 1, // insertion
        prev[j] + 1, // deletion
        prev[j - 1] + cost, // substitution
      );
    }

    prev = curr;
  }

  return prev[len2];
}

export function similarity(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;
  const maxLength = Math.max(len1, len2);

  // handle empty strings
  if (maxLength === 0) return 1.0;

  // early return for identical strings (case-insensitive)
  if (str1.toLowerCase() === str2.toLowerCase()) return 1.0;

  const distance = editDistance(str1, str2);
  return (maxLength - distance) / maxLength;
}

export function isNumeric(value: unknown): boolean {
  return typeof value === "string" && /^-?\d+$/.test(value);
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function countInstances(string: string, word: string): number {
  if (word.length === 0) return 0;
  return string.split(word).length - 1;
}

export function extractStr(pattern: RegExp, uri: string): string | null {
  const m = uri.match(pattern);
  return m?.[1] ?? null;
}

export function showChangelog() {
  Spicetify.PopupModal.display({
    title: "[aotyfy] Changelog",
    content: __CHANGELOG__,
    isLarge: true,
  });
}