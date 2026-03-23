import { useEffect, useState } from 'react';
import { ConnectionState } from '../types';
import { useAppContext } from '../contexts/AppContext';

/**
 * Subscribes to the gateway WebSocket connection state.
 * Returns the live ConnectionState value, updated on every transition.
 */
export function useConnectionState(): ConnectionState {
  const { gateway } = useAppContext();
  const [state, setState] = useState<ConnectionState>(gateway.getConnectionState());

  useEffect(() => {
    // Sync in case state changed between render and effect
    setState(gateway.getConnectionState());
    const off = gateway.on('connection', ({ state: next }) => {
      setState(next);
    });
    return off;
  }, [gateway]);

  return state;
}
