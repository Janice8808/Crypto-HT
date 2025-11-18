import React from "react";
import { NavLink } from "react-router-dom";
import { Home, BarChart2, LineChart, Wallet, Info } from "lucide-react";

const BottomNav = () => {
  const navItems = [
    { path: "/", label: "首页", icon: <Home size={22} /> },
    { path: "/market", label: "市场", icon: <BarChart2 size={22} /> },
    { path: "/trade", label: "交易", icon: <LineChart size={22} /> },
    { path: "/wallet", label: "钱包", icon: <Wallet size={22} /> },
    { path: "/coin/btc", label: "详情", icon: <Info size={22} /> },
  ];

  return (
    <div className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 shadow z-50">
      <div className="max-w-5xl mx-auto flex">
        {navItems.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center py-2 text-gray-600 text-xs ${
                isActive ? "text-orange-500 -translate-y-1" : ""
              }`
            }
          >
            {item.icon}
            <span>{item.label}</span>
          </NavLink>
        ))}
      </div>
    </div>
  );
};

export default BottomNav;
