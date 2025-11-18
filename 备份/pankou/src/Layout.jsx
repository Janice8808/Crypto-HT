// Layout.jsx
import React from 'react';
import { useLocation } from 'react-router-dom';
import BottomNav from './components/BottomNav';

const Layout = ({ children }) => {
  const location = useLocation();
  // Trade 页面不显示底部导航
  const hideBottomNav = location.pathname === '/trade';

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 pb-20">
      <div className="flex-1 w-full">{children}</div>
      {!hideBottomNav && <BottomNav />}
    </div>
  );
};

export default Layout;
