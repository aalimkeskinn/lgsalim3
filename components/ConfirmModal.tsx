import React from 'react';

interface ConfirmModalProps {
  isOpen: boolean;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title = 'Onay',
  message,
  confirmText = 'Evet, sil',
  cancelText = 'Vazgeç',
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-sm">
        <div className="px-4 py-3 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        </div>
        <div className="px-4 py-3">
          <p className="text-sm text-gray-700">{message}</p>
        </div>
        <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="text-[12px] px-2.5 py-1 rounded-md border border-gray-300 hover:bg-gray-50"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="text-[12px] px-2.5 py-1 rounded-md bg-rose-600 text-white hover:bg-rose-700"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
