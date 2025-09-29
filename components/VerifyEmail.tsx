import React, { useState } from 'react';
import { sendEmailVerification, signOut } from 'firebase/auth';
import { auth } from '../services/firebase';
import Spinner from './Spinner';

const VerifyEmail: React.FC = () => {
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleResend = async () => {
    if (!auth.currentUser) return;
    setSending(true);
    setMessage(null);
    setError(null);
    try {
      await sendEmailVerification(auth.currentUser);
      setMessage('Doğrulama e-postası gönderildi. Lütfen e-postanızı kontrol edin.');
    } catch (e) {
      setError('Doğrulama e-postası gönderilemedi. Daha sonra tekrar deneyin.');
    } finally {
      setSending(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white shadow rounded-lg p-8 w-full max-w-md text-center">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">E-postanızı Doğrulayın</h1>
        <p className="text-gray-600 mb-6">Devam etmek için e-posta adresinizi doğrulamanız gerekiyor.</p>
        {message && <p className="text-green-700 mb-4">{message}</p>}
        {error && <p className="text-red-600 mb-4">{error}</p>}
        <div className="flex gap-3 justify-center">
          <button
            onClick={handleResend}
            disabled={sending}
            className="bg-green-700 hover:bg-green-800 text-white font-semibold py-2 px-4 rounded disabled:bg-green-400 flex items-center justify-center min-w-[140px]"
          >
            {sending ? <Spinner /> : 'Doğrulama Mailini Yeniden Gönder'}
          </button>
          <button
            onClick={handleLogout}
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-4 rounded"
          >
            Çıkış Yap
          </button>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;
