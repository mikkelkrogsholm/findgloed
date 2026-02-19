import "@testing-library/jest-dom/vitest";

class ResizeObserverMock {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

if (!("ResizeObserver" in globalThis)) {
  Object.defineProperty(globalThis, "ResizeObserver", {
    value: ResizeObserverMock,
    configurable: true
  });
}

Object.defineProperty(Element.prototype, "hasPointerCapture", {
  value: () => false,
  configurable: true
});

Object.defineProperty(Element.prototype, "setPointerCapture", {
  value: () => undefined,
  configurable: true
});

Object.defineProperty(Element.prototype, "releasePointerCapture", {
  value: () => undefined,
  configurable: true
});

Object.defineProperty(Element.prototype, "scrollIntoView", {
  value: () => undefined,
  configurable: true
});
