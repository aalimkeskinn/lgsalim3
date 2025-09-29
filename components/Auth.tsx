import React, { useState } from 'react';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, sendEmailVerification, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../services/firebase';
import type { AuthMode } from '../types';
import Spinner from './Spinner';
import logo from '../idelogo.png';
import Alert from './Alert';

const Auth: React.FC = () => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value;
    // If user just typed '@', auto-complete domain
    if (v.endsWith('@')) {
      v = v + 'ide.k12.tr';
    } else {
      // If there's an '@' but no domain part, also complete
      const atIdx = v.indexOf('@');
      if (atIdx >= 0) {
        const local = v.slice(0, atIdx);
        const domain = v.slice(atIdx + 1);
        if (domain.length === 0) {
          v = `${local}@ide.k12.tr`;
        }
      }
    }
    setEmail(v);
  };

  const handleAuthAction = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    const normalizedEmail = email.trim().toLowerCase();

    // Check for ide.k12.tr domain, but only if it's not a password reset request
    if (mode !== 'reset') {
        const emailDomain = normalizedEmail.split('@')[1] || '';
        if (emailDomain !== 'ide.k12.tr') {
          setError('Giriş için e-posta adresiniz "ide.k12.tr" uzantılı olmalıdır.');
          setLoading(false);
          return;
        }
    }

    if (mode !== 'reset' && password.length < 6) {
        setError("Şifreniz en az 6 karakter olmalıdır.");
        setLoading(false);
        return;
    }

    try {
      if (mode === 'register') {
        const cred = await createUserWithEmailAndPassword(auth, normalizedEmail, password);
        if (cred.user) {
          try {
            await sendEmailVerification(cred.user);
            setMessage('Doğrulama e-postası gönderildi. Lütfen gelen kutunuzu kontrol edin.');
          } catch (ve) {
            // silently ignore, will still land on verify screen
          }
        }
      } else if (mode === 'login') {
        await signInWithEmailAndPassword(auth, normalizedEmail, password);
      } else if (mode === 'reset') {
        await sendPasswordResetEmail(auth, normalizedEmail);
        setMessage('Parola sıfırlama e-postası gönderildi. Lütfen gelen kutunuzu kontrol edin.');
        setMode('login');
      }
    } catch (err) {
      const authError = err as { code: string };
      console.error("Firebase Auth Error:", authError.code);
      switch (authError.code) {
        case 'auth/invalid-email':
          setError('Geçersiz bir e-posta adresi girdiniz.');
          break;
        case 'auth/user-not-found':
          setError('Bu e-posta adresi ile kayıtlı bir kullanıcı bulunamadı.');
          break;
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
          setError('E-posta adresiniz veya şifreniz hatalı. Lütfen tekrar deneyin.');
          break;
        case 'auth/email-already-in-use':
          setError('Bu e-posta adresi zaten başka bir hesap tarafından kullanılıyor.');
          break;
        case 'auth/too-many-requests':
          setError('Çok fazla deneme yapıldı. Lütfen daha sonra tekrar deneyin.');
          break;
        default:
          setError('Bir hata oluştu. Lütfen bilgilerinizi kontrol edip tekrar deneyin.');
      }
    } finally {
      setLoading(false);
    }
  };
  
  const switchMode = (e: React.MouseEvent, targetMode: AuthMode) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setPassword('');
    setMode(targetMode);
  };

  const getTitle = () => {
      if (mode === 'login') return 'Hesabınıza giriş yapın';
      if (mode === 'register') return 'Hesap oluşturun';
      return 'Parolanızı Sıfırlayın';
  }

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen bg-gray-100 font-sans p-4">
      <div className="w-full max-w-sm">
        <div className="bg-white shadow-xl rounded-lg">
          <div className="p-10">
            <div className="mb-6 flex flex-col items-center justify-center gap-3">
              <img src={logo} alt="ide okulları" className="h-16 w-auto" />
            </div>
            <h1 className="text-2xl font-semibold text-gray-800 mb-2 text-center">
              {getTitle()}
            </h1>
            {mode === 'login' && (
              <p className="text-center text-sm text-gray-600">
                Veya{' '}
                <a href="#" onClick={(e) => switchMode(e, 'register')} className="text-green-700 hover:underline font-semibold">
                  yeni bir hesap oluşturun
                </a>
              </p>
            )}
            
            <form onSubmit={handleAuthAction} className="mt-6">
              <Alert type="error" message={error || ''} />
              <Alert type="success" message={message || ''} />

              <div className="mb-4 relative">
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={handleEmailChange}
                  placeholder={mode === 'login' ? 'E-posta adresi' : 'E-posta'}
                  className="w-full pr-9 px-3 py-2 text-base text-gray-800 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-600 transition-colors"
                  required
                />
                {email && (
                  <button
                    type="button"
                    onClick={() => setEmail('')}
                    aria-label="E-postayı temizle"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    title="Temizle"
                  >
                    ×
                  </button>
                )}
              </div>
              {mode !== 'reset' && (
                <div className="mb-6 relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={mode === 'login' ? 'Şifre' : 'Parola'}
                    className="w-full pr-16 px-3 py-2 text-base text-gray-800 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-600 transition-colors"
                    required
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    {!!password && (
                      <button
                        type="button"
                        onClick={() => setPassword('')}
                        aria-label="Parolayı temizle"
                        title="Temizle"
                        className="text-gray-500 hover:text-gray-700"
                      >
                        ×
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? 'Parolayı gizle' : 'Parolayı göster'}
                      title={showPassword ? 'Gizle' : 'Göster'}
                      className="text-gray-600 hover:text-gray-800 text-sm font-medium"
                    >
                      {showPassword ? 'Gizle' : 'Göster'}
                    </button>
                  </div>
                </div>
              )}
              {mode === 'login' && (
                <div className="flex items-center justify-between mb-6 text-sm">
                  <label className="inline-flex items-center gap-2 text-gray-700">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300 text-green-700 focus:ring-green-600"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                    />
                    Beni hatırla
                  </label>
                  <a href="#" onClick={(e) => switchMode(e, 'reset')} className="text-green-700 hover:underline font-semibold">
                    Şifrenizi mi unuttunuz?
                  </a>
                </div>
              )}
              
              <div className="text-sm text-gray-600 text-center">
                {mode === 'login' && (
                    <>
                        <span className="hidden">Hesabınız yok mu?</span>
                    </>
                )}
                {mode === 'register' && (
                    <>
                        <span>Zaten bir hesabınız var mı? </span>
                        <a href="#" onClick={(e) => switchMode(e, 'login')} className="text-green-700 hover:underline font-semibold">
                            Oturum açın.
                        </a>
                    </>
                )}
                 {mode === 'reset' && (
                    <a href="#" onClick={(e) => switchMode(e, 'login')} className="text-gray-500 hover:underline font-semibold">
                        Giriş ekranına geri dön
                    </a>
                )}
              </div>
              
              <div className="flex justify-center mt-6">
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-green-700 hover:bg-green-800 text-white font-semibold py-2.5 px-10 rounded-lg focus:outline-none focus:shadow-outline transition-colors duration-200 disabled:bg-green-400 flex items-center justify-center min-w-[120px] h-11"
                >
                  {loading ? <Spinner /> : (mode === 'login' ? 'Giriş Yap' : mode === 'register' ? 'Kayıt Ol' : 'Sıfırlama Linki Gönder')}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;