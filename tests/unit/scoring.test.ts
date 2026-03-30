import { describe, it, expect } from "vitest";
import { calculateScore, evaluateAnswer, buildLeaderboard } from "../../src/lib/scoring";

describe("calculateScore", () => {
  it("returns 0 for an incorrect answer", () => {
    expect(calculateScore(1000, 20, 5000, false)).toBe(0);
  });

  it("returns full points for an instant answer (within grace window)", () => {
    const score = calculateScore(1000, 20, 100, true); // 100ms — inside grace
    expect(score).toBe(1000);
  });

  it("returns minimum fraction (50%) for an answer at the very end", () => {
    const score = calculateScore(1000, 20, 20_000, true); // answered at exactly limit
    expect(score).toBeGreaterThanOrEqual(500);
    expect(score).toBeLessThanOrEqual(510); // allow small rounding
  });

  it("returns a score between 500 and 1000 for a mid-time answer", () => {
    const score = calculateScore(1000, 20, 10_000, true); // half-time
    expect(score).toBeGreaterThan(500);
    expect(score).toBeLessThan(1000);
  });

  it("never goes below the minimum fraction", () => {
    const score = calculateScore(1000, 20, 100_000, true); // way over time
    expect(score).toBeGreaterThanOrEqual(500);
  });

  it("scales with base points", () => {
    const lowBase = calculateScore(500, 20, 1000, true);
    const highBase = calculateScore(2000, 20, 1000, true);
    expect(highBase).toBe(lowBase * 4);
  });
});

describe("evaluateAnswer", () => {
  it("accepts correct single answer (classic)", () => {
    expect(evaluateAnswer(["a"], ["a"], "classic")).toBe(true);
  });

  it("rejects wrong single answer (classic)", () => {
    expect(evaluateAnswer(["b"], ["a"], "classic")).toBe(false);
  });

  it("rejects multiple answers for classic type", () => {
    expect(evaluateAnswer(["a", "b"], ["a"], "classic")).toBe(false);
  });

  it("accepts exactly matching multiple answers (multiple type)", () => {
    expect(evaluateAnswer(["a", "b"], ["a", "b"], "multiple")).toBe(true);
    expect(evaluateAnswer(["b", "a"], ["a", "b"], "multiple")).toBe(true);
  });

  it("rejects partial selection in multiple type", () => {
    expect(evaluateAnswer(["a"], ["a", "b"], "multiple")).toBe(false);
  });

  it("rejects extra selections in multiple type", () => {
    expect(evaluateAnswer(["a", "b", "c"], ["a", "b"], "multiple")).toBe(false);
  });

  it("handles truefalse correctly", () => {
    expect(evaluateAnswer(["true"], ["true"], "truefalse")).toBe(true);
    expect(evaluateAnswer(["false"], ["true"], "truefalse")).toBe(false);
  });
});

describe("buildLeaderboard", () => {
  const alice = { id: "alice", displayName: "Alice", score: 1500 };
  const bob = { id: "bob", displayName: "Bob", score: 2000 };
  const carol = { id: "carol", displayName: "Carol", score: 500 };

  const prevScores = new Map([
    ["alice", 1000],
    ["bob", 1200],
    ["carol", 500],
  ]);

  it("sorts by score descending", () => {
    const lb = buildLeaderboard([alice, bob, carol], prevScores);
    expect(lb[0]?.playerId).toBe("bob");
    expect(lb[1]?.playerId).toBe("alice");
    expect(lb[2]?.playerId).toBe("carol");
  });

  it("assigns correct ranks starting from 1", () => {
    const lb = buildLeaderboard([alice, bob, carol], prevScores);
    expect(lb[0]?.rank).toBe(1);
    expect(lb[1]?.rank).toBe(2);
    expect(lb[2]?.rank).toBe(3);
  });

  it("calculates correct deltas", () => {
    const lb = buildLeaderboard([alice, bob, carol], prevScores);
    const bobEntry = lb.find((e) => e.playerId === "bob")!;
    const carolEntry = lb.find((e) => e.playerId === "carol")!;
    expect(bobEntry.delta).toBe(800); // 2000 - 1200
    expect(carolEntry.delta).toBe(0); // no change
  });

  it("handles empty player list", () => {
    const lb = buildLeaderboard([], new Map());
    expect(lb).toHaveLength(0);
  });

  it("handles players with no prior score", () => {
    const newPlayer = { id: "dave", displayName: "Dave", score: 700 };
    const lb = buildLeaderboard([newPlayer], new Map());
    expect(lb[0]?.delta).toBe(700);
  });
});
