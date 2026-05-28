import { useState, useCallback } from 'react';
import type { DemoResult } from '../types';

function stringifyObject(value: unknown) {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function formatError(error: unknown) {
  if (error instanceof Error) {
    return error.message || error.name;
  }

  if (error && typeof error === 'object') {
    const record = error as Record<string, any>;
    const message =
      record.message ||
      record.msg ||
      record.error?.message ||
      record.error?.msg ||
      record.data?.message ||
      record.data?.msg;

    if (typeof message === 'string' && message.length > 0) {
      return `${message}\n\n${stringifyObject(error)}`;
    }

    return stringifyObject(error);
  }

  return String(error);
}

/**
 * Hook for managing demo execution state
 */
export function useDemoExecution() {
  const [result, setResult] = useState<DemoResult>({ status: 'idle' });

  const execute = useCallback(async <T>(
    fn: () => Promise<T>,
    formatResult?: (data: T) => string
  ) => {
    setResult({ status: 'loading' });
    try {
      const data = await fn();
      const formatted = formatResult ? formatResult(data) : String(data);
      setResult({ status: 'success', data: formatted });
      return data;
    } catch (e) {
      setResult({ status: 'error', error: formatError(e) });
      throw e;
    }
  }, []);

  const reset = useCallback(() => {
    setResult({ status: 'idle' });
  }, []);

  return { result, execute, reset, isLoading: result.status === 'loading' };
}

/**
 * Get unisat provider from window
 */
export function getUnisat() {
  const unisat = (window as any).unisat;
  if (!unisat) {
    throw new Error('UniSat wallet not found');
  }
  return unisat;
}
