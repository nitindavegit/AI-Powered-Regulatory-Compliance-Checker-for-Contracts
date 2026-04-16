import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Upload as UploadIcon, File, X,
  ShieldCheck, Loader2, AlertCircle, ChevronRight
} from 'lucide-react';
import {
  generateContractHash,
  connectWallet,
  submitToBlockchain,
  isBlockchainRegistrationAvailable,
} from '../services/blockchain';
import { BLOCKCHAIN_CONFIG, isMockBlockchainEnabled } from '../config/blockchain.config';
import { analyzeContract, fileToBase64, saveBlockchainRecord } from '../services/gemini';

const Upload: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [status, setStatus] = useState<'idle' | 'connecting' | 'hashing' | 'blockchain' | 'analyzing' | 'complete' | 'error'>('idle');
  const [error, setError] = useState<string>('');
  const [useBlockchain, setUseBlockchain] = useState(isBlockchainRegistrationAvailable());
  const navigate = useNavigate();
  const blockchainAvailable = isBlockchainRegistrationAvailable();
  const mockBlockchainEnabled = isMockBlockchainEnabled();
  const networkName = BLOCKCHAIN_CONFIG.network.name;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (!isSupportedFile(droppedFile)) {
      setError('Unsupported file type. Upload a PDF, DOCX, or TXT contract.');
      return;
    }
    setFile(droppedFile);
    setError('');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    if (!isSupportedFile(selectedFile)) {
      setError('Unsupported file type. Upload a PDF, DOCX, or TXT contract.');
      return;
    }
    setFile(selectedFile);
    setError('');
  };

  const processContract = async () => {
    if (!file) return;

    try {
      setError('');

      setStatus('hashing');
      const hash = await generateContractHash(file);

      let blockchainResult: any = null;
      if (useBlockchain && blockchainAvailable) {
        if (!mockBlockchainEnabled) {
          setStatus('connecting');
          await connectWallet();
        }
        setStatus('blockchain');
        blockchainResult = await submitToBlockchain(hash);
      }

      setStatus('analyzing');

      const fileContentBase64 = await fileToBase64(file);
      const text = file.type === 'text/plain'
        ? await file.text()
        : `Uploaded contract file: ${file.name}`;

      const { analysis, contractId } = await analyzeContract(text, {
        fileName: file.name,
        fileSize: `${(file.size / 1024).toFixed(2)} KB`,
        hash,
        fileContentBase64,
      });

      if (blockchainResult) {
        await saveBlockchainRecord(contractId, blockchainResult);
      }

      sessionStorage.setItem('last_analysis', JSON.stringify({
        analysis,
        blockchain: blockchainResult ? {
          hash,
          ...blockchainResult,
        } : {
          hash,
          txId: 'N/A',
          blockNumber: 0,
          timestamp: new Date().toISOString(),
          status: blockchainAvailable ? 'Not registered' : 'Local only',
          contractAddress: 'N/A',
          explorerUrl: '#',
        },
        fileName: file.name,
        fileSize: `${(file.size / 1024).toFixed(2)} KB`,
        contractId,
      }));

      setStatus('complete');
      setTimeout(() => navigate('/analysis'), 1500);
    } catch (err: any) {
      console.error('Processing error:', err);
      setError(err.message || 'Processing failed');
      setStatus('error');
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-white tracking-tight">Upload Contract</h1>
        <p className="text-zinc-400 mt-1">Securely upload and verify your legal documents.</p>
      </header>

      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`relative border-2 border-dashed rounded-3xl p-12 transition-all flex flex-col items-center justify-center text-center ${
              isDragging
                ? 'border-emerald-500 bg-emerald-500/5'
                : 'border-white/10 bg-zinc-900/50 hover:border-white/20'
            }`}
          >
            <input
              type="file"
              onChange={handleFileChange}
              className="absolute inset-0 opacity-0 cursor-pointer"
              accept=".pdf,.docx,.txt"
              disabled={status !== 'idle'}
            />

            <div className="w-20 h-20 bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-6 border border-emerald-500/20">
              <UploadIcon className="w-10 h-10 text-emerald-500" />
            </div>

            <h3 className="text-xl font-bold text-white mb-2">
              {file ? file.name : 'Drop your contract here'}
            </h3>
            <p className="text-zinc-500 text-sm max-w-xs">
              Supports PDF, DOCX, and TXT files up to 20MB.
            </p>

            {file && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mt-8 flex items-center gap-4 p-4 bg-black/50 rounded-2xl border border-white/10 w-full max-w-sm"
              >
                <div className="p-3 bg-blue-500/10 rounded-xl">
                  <File className="w-6 h-6 text-blue-500" />
                </div>
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm font-bold text-white truncate">{file.name}</p>
                  <p className="text-xs text-zinc-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); setFile(null); }}
                  className="p-2 hover:bg-white/10 rounded-lg text-zinc-500 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </motion.div>
            )}
          </div>

          <AnimatePresence>
            {status !== 'idle' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="bg-zinc-900/50 border border-white/10 rounded-3xl p-8"
              >
                <h4 className="text-lg font-bold text-white mb-6">Processing Pipeline</h4>
                <div className="space-y-6">
                  {[
                    { id: 'hashing', label: 'Generating keccak256 Hash', icon: ShieldCheck },
                    ...(!mockBlockchainEnabled ? [{ id: 'connecting', label: `Connecting to ${networkName}`, icon: Loader2 }] : []),
                    { id: 'blockchain', label: mockBlockchainEnabled ? 'Writing to Mock Blockchain' : `Registering on ${networkName}`, icon: Loader2 },
                    { id: 'analyzing', label: 'AI Compliance Analysis', icon: Loader2 },
                  ].map((step) => {
                    const isCurrent = status === step.id;
                    const isDone =
                      ['blockchain', 'analyzing', 'complete', 'error'].includes(status) && (step.id === 'hashing' || step.id === 'connecting') ||
                      ['analyzing', 'complete', 'error'].includes(status) && step.id === 'blockchain' ||
                      status === 'complete' ||
                      status === 'error';

                    return (
                      <div key={step.id} className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center border transition-all ${
                          isDone ? 'bg-emerald-500/20 border-emerald-500 text-emerald-500' :
                          isCurrent ? 'bg-blue-500/20 border-blue-500 text-blue-500 animate-pulse' :
                          'bg-zinc-800 border-white/5 text-zinc-600'
                        }`}>
                          <step.icon className={`w-5 h-5 ${isCurrent && step.id === 'analyzing' ? 'animate-spin' : ''}`} />
                        </div>
                        <div className="flex-1">
                          <p className={`text-sm font-bold ${isDone ? 'text-white' : isCurrent ? 'text-blue-400' : 'text-zinc-600'}`}>
                            {step.label}
                          </p>
                          {isCurrent && <p className="text-xs text-zinc-500 mt-1">Processing...</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="space-y-6">
          <div className="bg-zinc-900/50 border border-white/10 rounded-3xl p-6">
            <h4 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-4">Verification Options</h4>
            <div className="space-y-4">
              <label className="flex items-center gap-3 p-3 bg-black/30 rounded-xl border border-white/5 cursor-pointer hover:border-emerald-500/50 transition-all">
                <input
                  type="checkbox"
                  checked={useBlockchain}
                  onChange={(e) => setUseBlockchain(e.target.checked)}
                  disabled={!blockchainAvailable}
                  className="w-4 h-4 rounded border-zinc-700 bg-zinc-800 text-emerald-500 focus:ring-emerald-500"
                />
                <span className={`text-sm ${blockchainAvailable ? 'text-zinc-300' : 'text-zinc-500'}`}>
                  {mockBlockchainEnabled ? 'Blockchain Registration' : `Blockchain Registration (${networkName})`}
                </span>
              </label>
              {!blockchainAvailable && (
                <p className="text-xs text-amber-400">
                  {networkName} submission is disabled until `VITE_CONTRACT_ADDRESS` is set to a deployed contract.
                </p>
              )}
              <label className="flex items-center gap-3 p-3 bg-black/30 rounded-xl border border-white/5 cursor-pointer hover:border-emerald-500/50 transition-all">
                <input type="checkbox" defaultChecked className="w-4 h-4 rounded border-zinc-700 bg-zinc-800 text-emerald-500 focus:ring-emerald-500" />
                <span className="text-sm text-zinc-300">AI Risk Scoring</span>
              </label>
              <label className="flex items-center gap-3 p-3 bg-black/30 rounded-xl border border-white/5 cursor-pointer hover:border-emerald-500/50 transition-all">
                <input type="checkbox" defaultChecked className="w-4 h-4 rounded border-zinc-700 bg-zinc-800 text-emerald-500 focus:ring-emerald-500" />
                <span className="text-sm text-zinc-300">GDPR/HIPAA Cross-Check</span>
              </label>
            </div>
          </div>

          <button
            disabled={!file || status !== 'idle'}
            onClick={processContract}
            className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all ${
              !file || status !== 'idle'
                ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                : 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-lg shadow-emerald-500/20'
            }`}
          >
            {status === 'idle' ? (
              <>
                Start Analysis
                <ChevronRight className="w-5 h-5" />
              </>
            ) : (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Processing...
              </>
            )}
          </button>

          <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl flex gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0" />
            <p className="text-xs text-emerald-400 leading-relaxed">
              Contract hashes are generated using keccak256 and can be {mockBlockchainEnabled ? 'recorded in the built-in mock blockchain' : 'optionally registered on-chain'} for tamper-evident proof.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const isSupportedFile = (candidate: File | null | undefined) => {
  if (!candidate) return false;
  return (
    candidate.type === 'application/pdf' ||
    candidate.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    candidate.type === 'text/plain'
  );
};

export default Upload;
