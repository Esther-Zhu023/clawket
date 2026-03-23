/** Payload for `canvas.present` — open or update the canvas panel. */
export type CanvasPresentPayload = {
  url?: string;
  title?: string;
};

/** Payload for `canvas.navigate` — navigate the WebView to a new URL. */
export type CanvasNavigatePayload = {
  url: string;
};

/** Payload for `canvas.eval` — execute JavaScript in the WebView. */
export type CanvasEvalPayload = {
  javascript: string;
};

/** Payload for `canvas.snapshot` — capture a screenshot of the WebView. */
export type CanvasSnapshotPayload = {
  format?: 'png' | 'jpeg';
};

/** Payload for `canvas.hide` — hide the canvas panel. */
export type CanvasHidePayload = Record<string, never>;

/** Envelope for a `node.invoke.request` event from the Gateway. */
export type NodeInvokeRequest = {
  id: string;
  command: string;
  params?: unknown;
};
