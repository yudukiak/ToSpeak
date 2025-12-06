declare module "safe-regex" {
  /**
   * 正規表現パターンがReDoS攻撃に対して安全かどうかをチェック
   * @param pattern チェックする正規表現パターン
   * @returns パターンが安全な場合true、危険な場合false
   */
  export default function safeRegex(pattern: string | RegExp): boolean;
}
