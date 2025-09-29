import React, { useState, useEffect, useRef } from 'react';
import { User } from 'firebase/auth';
import HomeIcon from './icons/HomeIcon';
import ChartBarIcon from './icons/ChartBarIcon';
import CalendarIcon from './icons/CalendarIcon';
import CogIcon from './icons/CogIcon';
import BookOpenIcon from './icons/BookOpenIcon';

interface HeaderProps {
  user: User;
  onLogout: () => void;
}

const Header: React.FC<HeaderProps> = ({ user, onLogout }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <header className="bg-white shadow-sm sticky top-0 z-40 border-b border-gray-200">
      <div className="container mx-auto max-w-6xl px-3 sm:px-4 lg:px-6">
        <div className="flex justify-between items-center h-16">
          {/* Left side */}
          <div className="flex items-center space-x-3">
            <img src="/idelogo.png" alt="ide okulları" className="h-8 w-auto" />
            <span className="text-xl font-bold text-gray-800">ide okulları</span>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            <nav className="hidden sm:flex items-center gap-2">
              <a href="#dashboard" className="p-3 bg-[#107C41] text-white rounded-full" title="Panel">
                  <ChartBarIcon />
              </a>
              <a href="#mistakes" className="p-3 bg-white text-gray-700 rounded-full border border-gray-300 hover:bg-gray-50" title="Hata Defteri">
                <BookOpenIcon />
              </a>
              <a href="#exams" className="p-3 bg-white text-gray-700 rounded-full border border-gray-300 hover:bg-gray-50" title="Deneme">
                <ChartBarIcon />
              </a>
            </nav>

            <div className="relative ml-4" ref={menuRef}>
              <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="flex text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#107C41]">
                <span className="sr-only">Kullanıcı menüsünü aç</span>
                <img
                  className="h-10 w-10 rounded-full object-cover"
                  src={`https://ui-avatars.com/api/?name=${user.email?.charAt(0)}&background=107C41&color=fff&bold=true&size=128`}
                  alt="Kullanıcı avatarı"
                />
              </button>
              {isMenuOpen && (
                <div 
                  className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg py-1 bg-white ring-1 ring-black ring-opacity-5 focus:outline-none"
                  role="menu"
                >
                  <div className="px-4 py-3 text-sm text-gray-700 border-b">
                    <p className="font-semibold">Giriş Yapan</p>
                    <p className="truncate" title={user.email || ''}>{user.email}</p>
                  </div>
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      onLogout();
                      setIsMenuOpen(false);
                    }}
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    role="menuitem"
                  >
                    Çıkış Yap
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;