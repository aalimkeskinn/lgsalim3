import React, { useState } from 'react';
import { supabase } from '../services/supabase';
import type { AuthMode } from '../types';
import Spinner from './Spinner';
import logo from '../idelogo.png';
import Alert from './Alert';

const AuthSupabase: React.FC = () => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value;
    if (v.endsWith('@')) {
      v = v + 'ide.k12.tr';
    } else {
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

    if (mode !== 'reset') {
      const emailDomain = normalizedEmail.split('@')[1] || '';
      if (emailDomain !== 'ide.k12.tr') {
        setError('Giriş için e-posta adresiniz "ide.k12.tr" uzantılı olmalıdır.');
        setLoading(false);
        return;
      }
    }

    if (mode !== 'reset' && password.length < 6) {
      setError('Şifreniz en az 6 karakter olmalıdır.');
      setLoading(false);
      return;
    }

    try {
      if (mode === 'register') {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: normalizedEmail,
          password: password,
          options: {
            emailRedirectTo: window.location.origin,
          }
        });

        if (signUpError) throw signUpError;

        if (data.user) {
          setMessage('Kayıt başarılı! Giriş yapabilirsiniz.');
          setMode('login');
        }
      } else if (mode === 'login') {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password: password,
        });

        if (signInError) throw signInError;
      } else if (mode === 'reset') {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
          redirectTo: window.location.origin,
        });

        if (resetError) throw resetError;

        setMessage('Parola sıfırlama e-postası gönderildi. Lütfen gelen kutunuzu kontrol edin.');
        setMode('login');
      }
    } catch (err: any) {
      console.error('Auth Error:', err);

      if (err.message?.includes('Invalid login credentials')) {
        setError('E-posta adresiniz veya şifreniz hatalı. Lütfen tekrar deneyin.');
      } else if (err.message?.includes('Email not confirmed')) {
        setError('E-posta adresiniz henüz doğrulanmamış. Lütfen e-postanızı kontrol edin.');
      } else if (err.message?.includes('User already registered')) {
        setError('Bu e-posta adresi zaten kayıtlı.');
      } else {
        setError(err.message || 'Bir hata oluştu. Lütfen tekrar deneyin.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 px-4 py-8">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl p-8 border border-gray-100">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <img src={logo} alt="Logo" className="h-16 w-auto" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {mode === 'register' ? 'Kayıt Ol' : mode === 'reset' ? 'Şifre Sıfırla' : 'Giriş Yap'}
            </h1>
            <p className="text-gray-600">
              {mode === 'register'
                ? 'LGS başarı takibi için hesap oluştur'
                : mode === 'reset'
                ? 'E-posta adresinize sıfırlama linki göndereceğiz'
                : 'LGS hazırlık platformuna hoş geldiniz'}
            </p>
          </div>

          {error && <Alert type="error" message={error} onClose={() => setError(null)} />}
          {message && <Alert type="success" message={message} onClose={() => setMessage(null)} />}

          <form onSubmit={handleAuthAction} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                E-posta Adresi
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={handleEmailChange}
                placeholder="kullanici@ide.k12.tr"
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
              <p className="mt-1 text-xs text-gray-500">
                @ yazarak otomatik tamamlama: @ide.k12.tr
              </p>
            </div>

            {mode !== 'reset' && (
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Şifre
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="En az 6 karakter"
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium py-3 px-4 rounded-lg hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <Spinner />
                  <span>İşleniyor...</span>
                </div>
              ) : (
                <span>
                  {mode === 'register' ? 'Kayıt Ol' : mode === 'reset' ? 'Şifre Sıfırla' : 'Giriş Yap'}
                </span>
              )}
            </button>
          </form>

          <div className="mt-6 text-center space-y-3">
            {mode === 'login' && (
              <>
                <button
                  onClick={() => setMode('reset')}
                  className="text-sm text-blue-600 hover:text-blue-700 hover:underline"
                >
                  Şifrenizi mi unuttunuz?
                </button>
                <div>
                  <span className="text-sm text-gray-600">Hesabınız yok mu? </span>
                  <button
                    onClick={() => setMode('register')}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium hover:underline"
                  >
                    Kayıt ol
                  </button>
                </div>
              </>
            )}
            {(mode === 'register' || mode === 'reset') && (
              <button
                onClick={() => setMode('login')}
                className="text-sm text-blue-600 hover:text-blue-700 hover:underline"
              >
                Giriş sayfasına dön
              </button>
            )}
          </div>
        </div>

        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            LGS Test Takip Platformu - İstanbul Devlet Eğitim
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthSupabase;
