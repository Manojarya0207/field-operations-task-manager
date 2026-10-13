import React from 'react';
import { Download, ExternalLink, FileText } from 'lucide-react';
import { Modal } from './Modal';

interface ReceiptViewerModalProps {
  url: string;
  title?: string;
  onClose: () => void;
}

export function ReceiptViewerModal({
  url,
  title = 'Receipt / Evidence Preview',
  onClose,
}: ReceiptViewerModalProps) {
  const isImage = /\.(jpeg|jpg|png|webp|svg)($|\?)/i.test(url) || url.includes('/preview');

  return (
    <Modal title={title} onClose={onClose} maxWidth="2xl">
      <div className="space-y-4">
        <div className="bg-slate-100 rounded-lg p-2 min-h-[300px] max-h-[500px] flex items-center justify-center overflow-hidden border border-slate-200">
          {isImage ? (
            <img
              src={url}
              alt="Receipt / Document"
              className="max-h-[480px] max-w-full object-contain rounded"
            />
          ) : (
            <div className="text-center p-8 space-y-3">
              <FileText size={48} className="mx-auto text-slate-400" />
              <p className="text-sm font-medium text-slate-600">Document preview not directly displayable</p>
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-sky-600 text-white rounded-lg text-sm font-medium"
              >
                <Download size={16} /> Download File
              </a>
            </div>
          )}
        </div>

        <div className="flex justify-between items-center text-xs text-slate-500">
          <span>Local storage document</span>
          <div className="flex gap-2">
            <a
              href={url}
              download
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-colors"
            >
              <Download size={14} /> Download
            </a>
          </div>
        </div>
      </div>
    </Modal>
  );
}
