"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { BuildOutlined, DownOutlined, FileTextOutlined, HomeOutlined, SendOutlined, ToolOutlined, UserOutlined, WalletOutlined, DashboardOutlined, BellOutlined, SettingOutlined, LogoutOutlined, MenuOutlined, CloseOutlined } from '@ant-design/icons'
import { clearAuthToken, getUser } from "@/lib/api";
import { useEffect, useRef, useState } from "react";
import { useUnreadNotifications } from "@/hooks/useUnreadNotifications";

// Landlord navigation items
const landlordNavItems = [
  { href: "/dashboard", label: "Tổng quan", icon: DashboardOutlined },
  { href: "/properties", label: "Tài sản", icon: BuildOutlined },
  { href: "/rooms", label: "Phòng", icon: HomeOutlined },
  { href: "/tenants", label: "Khách thuê", icon: UserOutlined },
  { href: "/invoices", label: "Hóa đơn", icon: FileTextOutlined },
  { href: "/payments", label: "Thanh toán", icon: WalletOutlined },
  { href: "/maintenance", label: "Bảo trì", icon: ToolOutlined },
  { href: "/invites", label: "Lời mời", icon: SendOutlined },
];

// Tenant navigation items
const tenantNavItems = [
  { href: "/dashboard", label: "Tổng quan", icon: DashboardOutlined },
  { href: "/invoices", label: "Hóa đơn", icon: FileTextOutlined },
  { href: "/maintenance", label: "Bảo trì", icon: ToolOutlined },
  { href: "/contract", label: "Hợp đồng", icon: FileTextOutlined },
];

const bottomItems = [
  { href: "/notifications", label: "Thông báo", icon: BellOutlined },
  { href: "/settings", label: "Cài đặt", icon: SettingOutlined },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const user = getUser();
  const { unreadCount } = useUnreadNotifications();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement | null>(null);
  const sidebarRef = useRef<HTMLDivElement | null>(null);
  const initialPathRef = useRef(pathname);

  const handleLogout = () => {
    clearAuthToken();
    router.push("/login");
  };

  // Close user menu on outside click
  useEffect(() => {
    if (!showUserMenu) return;
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [showUserMenu]);

  // Close mobile menu on outside click or route change
  useEffect(() => {
    if (initialPathRef.current === pathname) return;
    if (isMobileMenuOpen) {
      setIsMobileMenuOpen(false);
    }
  }, [pathname, isMobileMenuOpen]);

  useEffect(() => {
    if (!isMobileMenuOpen) return;
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        setIsMobileMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isMobileMenuOpen]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileMenuOpen]);

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="h-16 flex items-center gap-3 px-6 border-b border-[#E2E8F0]">
        <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center overflow-hidden">
          <Image
            src="/logo-homeeasy.svg"
            alt="Home Easy logo"
            width={40}
            height={40}
            className="object-contain w-full h-full"
            priority
          />
        </div>
        <span className="font-[family-name:var(--font-poppins)] text-xl font-bold text-[#0F172A]">
          Home Easy
        </span>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {(user?.role === "landlord" ? landlordNavItems : tenantNavItems).map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setIsMobileMenuOpen(false)}
              className={`
                relative flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group min-h-[44px] no-underline
                ${isActive 
                  ? "bg-primary/10 text-primary" 
                  : "text-[#0F172A] hover:bg-gray-100 hover:text-[#0F172A]"
                }
              `}
              style={isActive ? {} : { color: '#0F172A' }}
            >
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full"
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
              <item.icon className={`w-5 h-5 ${isActive ? "text-primary" : "text-[#0F172A]"}`} />
              <span className="text-sm font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom Navigation */}
      <div className="py-4 px-3 space-y-1 border-t border-[#E2E8F0]">
        {bottomItems.map((item) => {
          const isActive = pathname === item.href;
          const isNotifications = item.href === "/notifications";
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setIsMobileMenuOpen(false)}
              className={`
                relative flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all min-h-[44px] no-underline
                ${isActive 
                  ? "bg-primary/10 text-primary" 
                  : "text-[#0F172A] hover:bg-gray-100 hover:text-[#0F172A]"
                }
              `}
              style={isActive ? {} : { color: '#0F172A' }}
            >
              <item.icon className={`w-5 h-5 ${isActive ? "text-primary" : "text-[#0F172A]"}`} />
              <span className="text-sm font-medium">{item.label}</span>
              {isNotifications && unreadCount > 0 && (
                <span className="ml-auto min-w-[20px] h-5 px-1.5 flex items-center justify-center bg-red-500 text-white text-xs font-bold rounded-full">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {/* User Profile */}
      <div className="p-3 border-t border-[#E2E8F0]">
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 transition-colors min-h-[44px]"
          >
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
              {user?.full_name?.charAt(0) || user?.email?.charAt(0) || "U"}
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="text-sm font-medium text-[#0F172A] truncate">
                {user?.full_name || (user?.role === "landlord" ? "Chủ trọ" : "Khách thuê")}
              </p>
              <p className="text-xs text-[#64748B] truncate">
                {user?.email || ""}
              </p>
            </div>
            <DownOutlined className={`w-4 h-4 text-[#64748B] transition-transform ${showUserMenu ? "rotate-180" : ""}`} />
          </button>

          {/* User Menu Dropdown */}
          {showUserMenu && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-[#E2E8F0] rounded-lg shadow-xl overflow-hidden"
            >
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-red-500/10 transition-colors min-h-[44px]"
              >
                <LogoutOutlined className="w-4 h-4" />
                <span className="text-sm font-medium">Đăng xuất</span>
              </button>
            </motion.div>
          )}
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Hamburger Button - Mobile Only */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 w-10 h-10 flex items-center justify-center bg-white border border-[#E2E8F0] rounded-lg shadow-sm hover:bg-gray-50 transition-colors min-h-[44px] min-w-[44px] p-0"
        aria-label="Toggle menu"
      >
        <span className="flex items-center justify-center w-full h-full">
          {isMobileMenuOpen ? (
            <CloseOutlined 
              className="w-5 h-5 text-[#0F172A]"
            />
          ) : (
            <MenuOutlined 
              className="w-5 h-5 text-[#0F172A]"
            />
          )}
        </span>
      </button>

      {/* Backdrop Overlay - Mobile Only */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileMenuOpen(false)}
            className="lg:hidden fixed inset-0 bg-black/50 z-40"
          />
        )}
      </AnimatePresence>

      {/* Desktop Sidebar - Always visible on desktop */}
      <aside className="hidden lg:flex fixed left-0 top-0 h-screen w-64 bg-white border-r border-[#E2E8F0] flex-col z-40 shadow-sm">
        {sidebarContent}
      </aside>

      {/* Mobile Sidebar - Slide in from left */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.aside
            ref={sidebarRef}
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="lg:hidden fixed left-0 top-0 h-screen w-64 bg-white border-r border-[#E2E8F0] flex flex-col z-40 shadow-xl"
          >
            {sidebarContent}
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}

