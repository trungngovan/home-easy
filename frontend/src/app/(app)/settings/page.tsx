"use client";

import { useEffect, useState } from "react";
import { apiFetch, endpoints, clearAuthToken, getUser, setUser, Bank, BanksResponse } from "@/lib/api";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { BuildOutlined, CheckOutlined, LoadingOutlined, MailOutlined, PhoneOutlined, BankOutlined } from '@ant-design/icons'
import { Settings, User, Bell, Shield, Palette, CreditCard, Camera, LogOut,  } from 'lucide-react';
import { Input, Switch, Select, message } from "antd";

type UserProfile = {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  avatar: string | null;
  role: string;
  bank_account_number?: string | null;
  bank_code?: string | null;
};

export default function SettingsPage() {
  const router = useRouter();
  const currentUser = getUser();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("profile");

  // Form state
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");

  // Bank info state (for landlords)
  const [banks, setBanks] = useState<Bank[]>([]);
  const [loadingBanks, setLoadingBanks] = useState(false);
  const [bankCode, setBankCode] = useState<string>("");
  const [bankAccountNumber, setBankAccountNumber] = useState<string>("");
  const [savingBankInfo, setSavingBankInfo] = useState(false);

  // Notification settings
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [invoiceReminders, setInvoiceReminders] = useState(true);
  const [maintenanceAlerts, setMaintenanceAlerts] = useState(true);

  useEffect(() => {
    async function loadProfile() {
      try {
        const data = await apiFetch<UserProfile>(endpoints.me);
        setProfile(data);
        setFullName(data.full_name);
        setPhone(data.phone || "");
        setBankCode(data.bank_code || "");
        setBankAccountNumber(data.bank_account_number || "");
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Không thể tải dữ liệu";
        setError(message);
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, [router]);

  // Load banks list if user is landlord
  useEffect(() => {
    if (currentUser?.role === "landlord") {
      async function loadBanks() {
        try {
          setLoadingBanks(true);
          const data = await apiFetch<BanksResponse>(endpoints.banks);
          if (data.data) {
            setBanks(data.data);
          }
        } catch (err: unknown) {
          console.error("Failed to load banks:", err);
          // Don't show error, just allow manual entry
        } finally {
          setLoadingBanks(false);
        }
      }
      loadBanks();
    }
  }, [currentUser?.role]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const data = await apiFetch<UserProfile>("/users/update_profile/", {
        method: "PATCH",
        body: JSON.stringify({ full_name: fullName, phone: phone || null }),
      });
      setProfile(data);
      // Update stored user
      if (currentUser) {
        setUser({ ...currentUser, full_name: data.full_name, phone: data.phone });
      }
      setSuccess("Đã lưu thông tin thành công!");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Không thể lưu thông tin";
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    clearAuthToken();
    router.push("/login");
  };

  const handleSaveBankInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!bankCode || !bankAccountNumber) {
      message.error("Vui lòng nhập đầy đủ thông tin ngân hàng");
      return;
    }

    // Validate account number
    if (!/^\d+$/.test(bankAccountNumber)) {
      message.error("Số tài khoản chỉ được chứa số");
      return;
    }

    if (bankAccountNumber.length < 6 || bankAccountNumber.length > 19) {
      message.error("Số tài khoản phải có từ 6 đến 19 ký tự");
      return;
    }

    setSavingBankInfo(true);
    setError(null);
    setSuccess(null);

    try {
      const data = await apiFetch<UserProfile>("/users/update_profile/", {
        method: "PATCH",
        body: JSON.stringify({ 
          bank_code: bankCode,
          bank_account_number: bankAccountNumber,
        }),
      });
      setProfile(data);
      setBankCode(data.bank_code || "");
      setBankAccountNumber(data.bank_account_number || "");
      message.success("Đã lưu thông tin ngân hàng thành công!");
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Không thể lưu thông tin ngân hàng";
      setError(errorMessage);
      message.error(errorMessage);
    } finally {
      setSavingBankInfo(false);
    }
  };

  const tabs = [
    { id: "profile", label: "Hồ sơ", icon: User },
    { id: "notifications", label: "Thông báo", icon: Bell },
    { id: "security", label: "Bảo mật", icon: Shield },
    { id: "billing", label: "Thanh toán", icon: CreditCard },
  ];

  if (loading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="h-8 w-48 bg-border-dark rounded animate-pulse mb-8" />
        <div className="w-full grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="h-64 bg-white rounded-xl animate-pulse" />
          <div className="lg:col-span-3 h-96 bg-white rounded-xl animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <motion.div
        className="mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="font-[family-name:var(--font-poppins)] text-2xl lg:text-3xl font-bold text-[#0F172A]">
          Cài đặt
        </h1>
        <p className="text-[#475569] mt-1">Quản lý tài khoản và tùy chọn của bạn</p>
      </motion.div>

      <div className="w-full grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Sidebar - Desktop Vertical, Mobile Horizontal */}
        <motion.div
          className="lg:col-span-1"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          {/* Desktop: Vertical Sidebar */}
          <div className="hidden lg:block bg-white border border-[#E2E8F0] rounded-xl p-4">
            <nav className="space-y-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors min-h-[44px] ${
                      activeTab === tab.id
                        ? "bg-primary/10 text-primary"
                        : "text-[#475569] hover:bg-gray-50 hover:text-[#0F172A]"
                    }`}
                  >
                    <Icon className="w-5 h-5 shrink-0" />
                    <span className="font-medium">{tab.label}</span>
                  </button>
                );
              })}
              <hr className="border-[#E2E8F0] my-3" />
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left text-red-400 hover:bg-red-500/10 transition-colors min-h-[44px]"
              >
                <LogOut className="w-5 h-5 shrink-0" />
                <span className="font-medium">Đăng xuất</span>
              </button>
            </nav>
          </div>

          {/* Mobile: Horizontal Tabs */}
          <div className="lg:hidden bg-white border border-[#E2E8F0] rounded-xl p-2 overflow-x-auto">
            <nav className="flex gap-2">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap shrink-0 min-h-[44px] ${
                      activeTab === tab.id
                        ? "bg-primary/10 text-primary"
                        : "text-[#475569] hover:bg-gray-50 hover:text-[#0F172A]"
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Mobile: Logout Button */}
          <button
            onClick={handleLogout}
            className="lg:hidden w-full mt-4 flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-red-400 border border-red-400/30 hover:bg-red-500/10 transition-colors min-h-[44px]"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Đăng xuất</span>
          </button>
        </motion.div>

        {/* Content */}
        <motion.div
          className="lg:col-span-3"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400 flex items-center gap-2">
              <CheckOutlined className="w-5 h-5" />
              {success}
            </div>
          )}

          {/* Profile Tab */}
          {activeTab === "profile" && (
            <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-semibold text-[#0F172A] mb-4 sm:mb-6">Thông tin cá nhân</h2>

              {/* Avatar */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 mb-4 sm:mb-6 pb-4 sm:pb-6 border-b border-[#E2E8F0]">
                <div className="relative shrink-0">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="w-8 h-8 sm:w-10 sm:h-10 text-primary" />
                  </div>
                  <button className="absolute bottom-0 right-0 w-7 h-7 sm:w-8 sm:h-8 bg-primary text-white rounded-full flex items-center justify-center hover:bg-primary/90 transition-colors min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0">
                    <Camera className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </button>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base sm:text-lg font-semibold text-[#0F172A] truncate">{profile?.full_name}</h3>
                  <p className="text-sm text-[#475569] truncate">{profile?.email}</p>
                  <p className="text-xs text-primary mt-1">
                    {profile?.role === "landlord" ? "Chủ trọ" : "Khách thuê"}
                  </p>
                </div>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-4 sm:space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#475569] mb-2">
                      Họ và tên
                    </label>
                    <Input
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      size="large"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#475569] mb-2">
                      Số điện thoại
                    </label>
                    <Input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="0912345678"
                      size="large"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#475569] mb-2">
                    Email
                  </label>
                  <Input
                    type="email"
                    value={profile?.email || ""}
                    disabled
                    size="large"
                  />
                  <p className="text-xs text-[#475569] mt-1">
                    Email không thể thay đổi
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex items-center justify-center gap-2 px-6 py-2.5 bg-primary text-white font-semibold rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 min-h-[44px] w-full sm:w-auto"
                  >
                    {saving ? (
                      <>
                        <LoadingOutlined className="w-4 h-4 animate-spin" />
                        Đang lưu...
                      </>
                    ) : (
                      "Lưu thay đổi"
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === "notifications" && (
            <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-semibold text-[#0F172A] mb-4 sm:mb-6">Cài đặt thông báo</h2>

              <div className="space-y-3 sm:space-y-4">
                {[
                  {
                    id: "email",
                    label: "Thông báo qua Email",
                    description: "Nhận thông báo qua email",
                    icon: MailOutlined,
                    checked: emailNotifications,
                    onChange: setEmailNotifications,
                  },
                  {
                    id: "push",
                    label: "Thông báo đẩy",
                    description: "Nhận thông báo trên trình duyệt",
                    icon: Bell,
                    checked: pushNotifications,
                    onChange: setPushNotifications,
                  },
                  {
                    id: "invoice",
                    label: "Nhắc nhở hóa đơn",
                    description: "Nhận nhắc nhở khi hóa đơn sắp đến hạn",
                    icon: CreditCard,
                    checked: invoiceReminders,
                    onChange: setInvoiceReminders,
                  },
                  {
                    id: "maintenance",
                    label: "Cảnh báo bảo trì",
                    description: "Nhận thông báo về yêu cầu bảo trì",
                    icon: Settings,
                    checked: maintenanceAlerts,
                    onChange: setMaintenanceAlerts,
                  },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3 sm:p-4 bg-white border border-[#E2E8F0] rounded-lg gap-3 sm:gap-4"
                    >
                      <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Icon className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm sm:text-base font-medium text-[#0F172A]">{item.label}</p>
                          <p className="text-xs sm:text-sm text-[#475569] mt-0.5">{item.description}</p>
                        </div>
                      </div>
                      <Switch
                        checked={item.checked}
                        onChange={item.onChange}
                        className="shrink-0"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === "security" && (
            <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-semibold text-[#0F172A] mb-4 sm:mb-6">Bảo mật</h2>

              <div className="space-y-4 sm:space-y-6">
                <div className="p-4 sm:p-6 bg-white border border-[#E2E8F0] rounded-lg">
                  <h3 className="text-base sm:text-lg font-semibold text-[#0F172A] mb-2">Đổi mật khẩu</h3>
                  <p className="text-sm text-[#475569] mb-4">
                    Đổi mật khẩu đăng nhập của bạn
                  </p>
                  <button className="w-full sm:w-auto px-6 py-2.5 bg-primary text-white font-semibold rounded-lg hover:bg-primary/90 transition-colors min-h-[44px]">
                    Đổi mật khẩu
                  </button>
                </div>

                <div className="p-4 sm:p-6 bg-white border border-[#E2E8F0] rounded-lg">
                  <h3 className="text-base sm:text-lg font-semibold text-[#0F172A] mb-2">Xác thực 2 yếu tố</h3>
                  <p className="text-sm text-[#475569] mb-4">
                    Thêm lớp bảo mật cho tài khoản của bạn
                  </p>
                  <button className="w-full sm:w-auto px-6 py-2.5 bg-primary text-white font-semibold rounded-lg hover:bg-primary/90 transition-colors min-h-[44px]">
                    Thiết lập 2FA
                  </button>
                </div>

                <div className="p-4 sm:p-6 bg-white border border-[#E2E8F0] rounded-lg">
                  <h3 className="text-base sm:text-lg font-semibold text-[#0F172A] mb-2">Phiên đăng nhập</h3>
                  <p className="text-sm text-[#475569] mb-4">
                    Quản lý các phiên đăng nhập của bạn
                  </p>
                  <button className="w-full sm:w-auto px-6 py-2.5 bg-primary text-white font-semibold rounded-lg hover:bg-primary/90 transition-colors min-h-[44px]">
                    Xem phiên đăng nhập
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Billing Tab */}
          {activeTab === "billing" && (
            <div className="space-y-6">
              {/* Bank Info Section - Only for landlords */}
              {currentUser?.role === "landlord" && (
                <motion.div
                  className="bg-white/80 backdrop-blur-sm border border-[#E2E8F0] rounded-xl p-4 sm:p-6 hover:border-primary/30 transition-colors"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className="flex items-center gap-3 mb-4 sm:mb-6">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <BankOutlined className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-lg sm:text-xl font-semibold text-[#0F172A]">Thông tin ngân hàng</h2>
                      <p className="text-sm text-[#475569]">Cấu hình thông tin ngân hàng để tạo mã QR thanh toán</p>
                    </div>
                  </div>

                  <form onSubmit={handleSaveBankInfo} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-[#475569] mb-2">
                        Ngân hàng *
                      </label>
                      <Select
                        className="w-full"
                        size="large"
                        placeholder="Chọn ngân hàng"
                        value={bankCode || undefined}
                        onChange={(value) => setBankCode(value)}
                        loading={loadingBanks}
                        showSearch
                        filterOption={(input, option) =>
                          (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
                        }
                        options={banks.map((bank) => ({
                          value: bank.code,
                          label: `${bank.name} (${bank.code})`,
                        }))}
                      />
                      {loadingBanks && (
                        <p className="text-xs text-[#64748B] mt-1">Đang tải danh sách ngân hàng...</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[#475569] mb-2">
                        Số tài khoản *
                      </label>
                      <Input
                        type="text"
                        size="large"
                        placeholder="Nhập số tài khoản (6-19 ký tự)"
                        value={bankAccountNumber}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, ""); // Only numbers
                          setBankAccountNumber(value);
                        }}
                        maxLength={19}
                        minLength={6}
                      />
                      <p className="text-xs text-[#64748B] mt-1">
                        Số tài khoản phải có từ 6 đến 19 ký tự, chỉ chứa số
                      </p>
                    </div>

                    {profile?.bank_code && profile?.bank_account_number && (
                      <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                        <p className="text-sm text-green-600">
                          <CheckOutlined className="w-4 h-4 inline mr-2" />
                          Đã cấu hình: {banks.find(b => b.code === profile.bank_code)?.name || profile.bank_code} - {profile.bank_account_number}
                        </p>
                      </div>
                    )}

                    <div className="flex justify-end pt-2">
                      <button
                        type="submit"
                        disabled={savingBankInfo || !bankCode || !bankAccountNumber}
                        className="flex items-center justify-center gap-2 px-6 py-2.5 bg-primary text-white font-semibold rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
                      >
                        {savingBankInfo ? (
                          <>
                            <LoadingOutlined className="w-4 h-4 animate-spin" />
                            Đang lưu...
                          </>
                        ) : (
                          "Lưu thông tin ngân hàng"
                        )}
                      </button>
                    </div>
                  </form>
                </motion.div>
              )}

              <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 sm:p-6">
                <h2 className="text-lg sm:text-xl font-semibold text-[#0F172A] mb-4 sm:mb-6">Thanh toán & Gói dịch vụ</h2>

                <div className="p-4 sm:p-6 bg-gradient-to-br from-primary/20 to-primary/5 rounded-xl border border-primary/20 mb-4 sm:mb-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
                    <div className="flex-1">
                      <span className="text-xs text-primary font-medium uppercase tracking-wider">
                        Gói hiện tại
                      </span>
                      <h3 className="text-xl sm:text-2xl font-bold text-[#0F172A] mt-1">Miễn phí</h3>
                    </div>
                    <BuildOutlined className="w-10 h-10 sm:w-12 sm:h-12 text-primary/50 shrink-0" />
                  </div>
                  <p className="text-sm text-[#475569] mb-4">
                    Quản lý tối đa 5 phòng • Tính năng cơ bản
                  </p>
                  <button className="w-full py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary/90 transition-colors min-h-[44px]">
                    Nâng cấp lên Pro
                  </button>
                </div>

                <div className="space-y-4">
                  <h3 className="text-base sm:text-lg font-semibold text-[#0F172A]">Lịch sử thanh toán</h3>
                  <div className="text-center py-8 text-[#475569]">
                    <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>Chưa có giao dịch nào</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
