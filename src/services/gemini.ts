import { authFetch } from './api';

interface AnalyzeOptions {
  fileName?: string;
  fileSize?: string;
  hash?: string;
  fileContentBase64?: string;
}

export const analyzeContract = async (text: string, options: AnalyzeOptions = {}) => {
  const token = localStorage.getItem('auth_token');
  if (!token) {
    throw new Error('Not authenticated');
  }

  const contractResponse = await authFetch('/api/contracts', {
    method: 'POST',
    body: JSON.stringify({
      fileName: options.fileName || 'Uploaded Contract',
      fileSize: options.fileSize || `${(text.length / 1024).toFixed(2)} KB`,
      hash: options.hash || await generateHash(text),
      status: 'Analyzing',
    }),
  });

  if (!contractResponse.ok) {
    const error = await contractResponse.json();
    throw new Error(error.error || 'Failed to create contract record');
  }

  const contract = await contractResponse.json();

  const analysisResponse = await authFetch(`/api/contracts/${contract.id}/analysis`, {
    method: 'POST',
    body: JSON.stringify({
      text,
      fileName: options.fileName,
      fileContentBase64: options.fileContentBase64,
    }),
  });

  if (!analysisResponse.ok) {
    const error = await analysisResponse.json();
    throw new Error(error.error || 'Analysis failed');
  }

  const result = await analysisResponse.json();
  return {
    analysis: result.analysis,
    contractId: contract.id,
  };
};

export const saveBlockchainRecord = async (contractId: string, payload: {
  txId: string;
  blockNumber: number;
  timestamp: string;
  status: string;
  contractAddress: string;
  explorerUrl: string;
}) => {
  const response = await authFetch(`/api/contracts/${contractId}/blockchain`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to save blockchain record');
  }

  return response.json();
};

export const fileToBase64 = async (file: File): Promise<string> => {
  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  let binary = '';
  const chunkSize = 0x8000;

  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
};

const generateHash = async (text: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
};
