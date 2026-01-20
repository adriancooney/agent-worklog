'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';

interface LocalApiConfig {
  port: number;
  token: string;
}

interface UseLocalApiResult {
  config: LocalApiConfig | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  fetchApi: <T>(path: string, options?: { method?: string; body?: unknown }) => Promise<T>;
}

export function useLocalApi(): UseLocalApiResult {
  const [config, setConfig] = useState<LocalApiConfig | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const port = params.get('port');
    const token = params.get('token');

    if (port && token) {
      const portNum = parseInt(port, 10);
      if (!isNaN(portNum)) {
        setConfig({ port: portNum, token });
        checkConnection(portNum, token);
      } else {
        setError('Invalid port number');
        setIsConnecting(false);
      }
    } else {
      setError('Missing port or token in URL. Run "aw web" to connect.');
      setIsConnecting(false);
    }
  }, []);

  const checkConnection = async (port: number, token: string) => {
    try {
      const response = await fetch(`http://localhost:${port}/health`);
      if (response.ok) {
        setIsConnected(true);
        setError(null);
      } else {
        setError('Failed to connect to local server');
      }
    } catch {
      setError('Cannot connect to local server. Is "aw web" running?');
    } finally {
      setIsConnecting(false);
    }
  };

  const fetchApi = useCallback(
    async <T>(path: string, options: { method?: string; body?: unknown } = {}): Promise<T> => {
      if (!config) {
        throw new Error('Not connected to local API');
      }

      const { method = 'GET', body } = options;
      const url = `http://localhost:${config.port}${path}`;

      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${config.token}`,
          'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Unauthorized. Token may have expired. Restart "aw web".');
        }
        throw new Error(`API error: ${response.status}`);
      }

      return response.json();
    },
    [config]
  );

  return {
    config,
    isConnected,
    isConnecting,
    error,
    fetchApi,
  };
}
