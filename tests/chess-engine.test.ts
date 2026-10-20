import { afterEach, describe, expect, it, vi } from "vitest";
import Engine from "@/stockfish/engine";
class TestWorker {
  static instances: TestWorker[] = [];
  messages: string[] = [];
  listeners = new Set<(event: MessageEvent<string>) => void>();
  terminated = false;
  constructor() {
    TestWorker.instances.push(this);
  }
  postMessage(message: string) {
    this.messages.push(message);
  }
  addEventListener(
    _name: string,
    listener: (event: MessageEvent<string>) => void,
  ) {
    this.listeners.add(listener);
  }
  removeEventListener(
    _name: string,
    listener: (event: MessageEvent<string>) => void,
  ) {
    this.listeners.delete(listener);
  }
  terminate() {
    this.terminated = true;
  }
  emit(data: string) {
    this.listeners.forEach((listener) =>
      listener(new MessageEvent<string>("message", { data })),
    );
  }
}
afterEach(() => {
  vi.unstubAllGlobals();
  TestWorker.instances = [];
});
describe("Chess engine lifecycle", () => {
  it("provides removable callbacks and reads completed best moves", () => {
    vi.stubGlobal("window", {});
    vi.stubGlobal("Worker", TestWorker);
    const engine = new Engine();
    const worker = TestWorker.instances[0];
    const listener = vi.fn();
    const unsubscribe = engine.onMessage(listener);
    worker.emit("bestmove e7e8q ponder a1b2");
    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({ bestMove: "e7e8q", ponder: "a1b2" }),
    );
    unsubscribe();
    worker.emit("bestmove e2e4");
    expect(listener).toHaveBeenCalledTimes(1);
  });
  it("bounds engine thinking time and terminates the owned worker", () => {
    vi.stubGlobal("window", {});
    vi.stubGlobal("Worker", TestWorker);
    const engine = new Engine();
    const worker = TestWorker.instances[0];
    engine.evaluatePosition("example", 18, 1800);
    expect(worker.messages).toContain("go depth 18 movetime 1800");
    engine.terminate();
    expect(worker.terminated).toBe(true);
    expect(engine.stockfish).toBeNull();
    const next = new Engine();
    expect(next.stockfish).not.toBe(worker);
  });
});
