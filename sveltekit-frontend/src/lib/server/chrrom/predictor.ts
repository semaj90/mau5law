// Lightweight Markov-chain predictor for next-action precomputation (RNN-inspired)
// Learns P(next|prev) from short user interaction sequences

type Action = string; // e.g., 'open:doc:123', 'hover:doc:123', 'search:term:indemnification'

class MarkovPredictor {
  private transitions = new Map<Action, Map<Action, number>>();
  private lastByUser = new Map<string, Action>();

  record(userId: string, action: Action) {
    const prev = this.lastByUser.get(userId);
    if (prev) {
      const m = this.transitions.get(prev) ?? new Map<Action, number>();
      m.set(action, (m.get(action) ?? 0) + 1);
      this.transitions.set(prev, m);
    }
    this.lastByUser.set(userId, action);
  }

  predictNext(prev: Action, topK = 3): Array<{ action: Action; p: number }> {
    const m = this.transitions.get(prev);
    if (!m) return [];
    const total = Array.from(m.values()).reduce((a, b) => a + b, 0) || 1;
    return Array.from(m.entries())
      .map(([action, count]) => ({ action, p: count / total }))
      .sort((a, b) => b.p - a.p)
      .slice(0, topK);
  }
}

export const predictor = new MarkovPredictor();

export function mapActionToCHRContext(a: Action): { docId?: string; query?: string } {
  // Simple mapping conventions
  if (a.startsWith('open:doc:')) return { docId: a.split(':')[2] };
  if (a.startsWith('hover:doc:')) return { docId: a.split(':')[2] };
  if (a.startsWith('search:term:')) return { query: decodeURIComponent(a.substring('search:term:'.length)) };
  return {};
}
