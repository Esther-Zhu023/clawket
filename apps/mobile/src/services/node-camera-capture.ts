export type NodeCameraCaptureRequest = {
  facing: 'front' | 'back';
  quality: number;
};

export type NodeCameraCaptureResult = {
  uri: string;
  width: number;
  height: number;
  format: 'jpg' | 'png';
};

export class NodeCameraCaptureError extends Error {
  public readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = 'NodeCameraCaptureError';
  }
}

type NodeCameraCaptureDelegate = (
  request: NodeCameraCaptureRequest,
) => Promise<NodeCameraCaptureResult>;

let activeDelegate: NodeCameraCaptureDelegate | null = null;

export function registerNodeCameraCaptureDelegate(
  delegate: NodeCameraCaptureDelegate,
): () => void {
  activeDelegate = delegate;
  return () => {
    if (activeDelegate === delegate) {
      activeDelegate = null;
    }
  };
}

export async function requestNodeCameraCapture(
  request: NodeCameraCaptureRequest,
): Promise<NodeCameraCaptureResult> {
  if (!activeDelegate) {
    throw new NodeCameraCaptureError(
      'UNAVAILABLE',
      'Automatic camera capture is unavailable because the capture provider is not mounted.',
    );
  }
  return activeDelegate(request);
}
