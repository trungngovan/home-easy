"use client";

import { useEffect, useState } from "react";
import { apiFetch, endpoints, clearAuthToken, PaginatedResponse, buildPaginatedPath, getAuthToken, getUser, QRCodeResponse, User as UserType } from "@/lib/api";
import { useRouter, useParams } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowLeftOutlined, CalendarOutlined, CheckCircleOutlined, ClockCircleOutlined, CopyOutlined, DownloadOutlined, EditOutlined, ExclamationCircleOutlined, FileTextOutlined, HomeOutlined, LoadingOutlined, MailOutlined, PhoneOutlined, UserOutlined, WalletOutlined, QrcodeOutlined } from '@ant-design/icons'
import { CreditCard, X } from 'lucide-react';
import { Select, Input, InputNumber, message } from "antd";

type Property = {
  id: string;
  name: string;
};

type Room = {
  id: string;
  building: string;
  room_number: string;
};

type Tenancy = {
  id: string;
  room: string;
  tenant: string;
};

type User = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
};

type InvoiceLine = {
  id: string;
  item_type: string;
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
};

type Invoice = {
  id: string;
  tenancy: string;
  period: string;
  total_amount: number;
  amount_due: number;
  status: string;
  due_date: string | null;
  issued_at: string | null;
  paid_at: string | null;
  notes: string;
  created_at: string;
  lines: InvoiceLine[];
};

type Payment = {
  id: string;
  invoice: string;
  amount: number;
  method: string;
  status: string;
  created_at: string;
};

const itemTypeLabels: Record<string, string> = {
  rent: "Tiền phòng",
  electricity: "Tiền điện",
  water: "Tiền nước",
  internet: "Internet",
  cleaning: "Vệ sinh",
  service: "Dịch vụ khác",
  adjustment: "Điều chỉnh",
  deposit: "Tiền cọc",
};

const statusConfig: Record<string, { color: string; icon: typeof FileTextOutlined; label: string }> = {
  draft: { color: "bg-gray-500/20 text-gray-400 border-gray-500/30", icon: FileTextOutlined, label: "Nháp" },
  pending: { color: "bg-orange-500/20 text-orange-400 border-orange-500/30", icon: ClockCircleOutlined, label: "Chờ thanh toán" },
  partial: { color: "bg-blue-500/20 text-blue-400 border-blue-500/30", icon: WalletOutlined, label: "Thanh toán 1 phần" },
  paid: { color: "bg-green-500/20 text-green-400 border-green-500/30", icon: CheckCircleOutlined, label: "Đã thanh toán" },
  overdue: { color: "bg-red-500/20 text-red-400 border-red-500/30", icon: ExclamationCircleOutlined, label: "Quá hạn" },
};

export default function InvoiceDetailPage() {
  const router = useRouter();
  const params = useParams();
  const user = getUser();
  const isTenant = user?.role === "tenant";
  // Safely extract id from params - handle Next.js 16 params serialization
  // Extract immediately to avoid serialization issues
  const invoiceId = (() => {
    try {
      if (params && typeof params === 'object' && 'id' in params) {
        return String(params.id);
      }
      return '';
    } catch {
      return '';
    }
  })();

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [tenancies, setTenancies] = useState<Tenancy[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<string>("cash");
  const [paymentNote, setPaymentNote] = useState<string>("");
  
  // QR code state
  const [qrCodeData, setQrCodeData] = useState<QRCodeResponse | null>(null);
  const [loadingQR, setLoadingQR] = useState(false);
  const [landlordInfo, setLandlordInfo] = useState<UserType | null>(null);

  useEffect(() => {
    if (!invoiceId) {
      setError("Không tìm thấy ID hóa đơn");
      setLoading(false);
      return;
    }

    async function loadData() {
      try {
        // Load invoice first
        const invoiceData = await apiFetch<Invoice>(`${endpoints.invoices}${invoiceId}/`);
        
        // For tenants, verify the invoice belongs to them
        if (isTenant) {
          // Get tenancy to check if it belongs to current user
          const tenanciesData = await apiFetch<PaginatedResponse<Tenancy>>(
            buildPaginatedPath(endpoints.tenancies, { pageSize: 200 })
          );
          const tenancy = tenanciesData.results.find(t => t.id === invoiceData.tenancy);
          
          if (!tenancy || tenancy.tenant !== user?.id) {
            setError("Bạn không có quyền xem hóa đơn này");
            setLoading(false);
            return;
          }
          
          // Load minimal data for tenant
          const [paymentsData] = await Promise.all([
            apiFetch<PaginatedResponse<Payment>>(buildPaginatedPath(endpoints.payments, { pageSize: 200 })),
          ]);
          
          setInvoice(invoiceData);
          setPayments((paymentsData.results || []).filter((p) => p.invoice === invoiceId));
        } else {
          // Landlord loads all data
          const [propsData, roomsData, tenanciesData, usersData, paymentsData] =
            await Promise.all([
              apiFetch<PaginatedResponse<Property>>(buildPaginatedPath(endpoints.properties, { pageSize: 200 })),
              apiFetch<PaginatedResponse<Room>>(buildPaginatedPath(endpoints.rooms, { pageSize: 200 })),
              apiFetch<PaginatedResponse<Tenancy>>(buildPaginatedPath(endpoints.tenancies, { pageSize: 200 })),
              apiFetch<PaginatedResponse<User>>(buildPaginatedPath(endpoints.users, { pageSize: 200 })),
              apiFetch<PaginatedResponse<Payment>>(buildPaginatedPath(endpoints.payments, { pageSize: 200 })),
            ]);

          setInvoice(invoiceData);
          setProperties(propsData.results || []);
          setRooms(roomsData.results || []);
          setTenancies(tenanciesData.results || []);
          setUsers(usersData.results || []);
          setPayments((paymentsData.results || []).filter((p) => p.invoice === invoiceId));
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Không thể tải dữ liệu";
        setError(message);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [invoiceId, router, isTenant, user?.id]);

  const handleOpenPaymentModal = () => {
    if (invoice) {
      setPaymentAmount(invoice.amount_due.toString());
      setPaymentMethod("cash");
      setPaymentNote("");
      setQrCodeData(null);
      setShowPaymentModal(true);
    }
  };

  const handleClosePaymentModal = () => {
    setShowPaymentModal(false);
    setPaymentAmount("");
    setPaymentMethod("cash");
    setPaymentNote("");
    setQrCodeData(null);
  };

  // Load QR code when payment method changes to bank_transfer or momo
  useEffect(() => {
    if (showPaymentModal && (paymentMethod === "bank_transfer" || paymentMethod === "momo") && invoice && isTenant) {
      const loadQRCode = async () => {
        try {
          setLoadingQR(true);
          
          // First, get landlord info to check if they have bank info
          // For tenant, we need to get landlord from the invoice's tenancy
          if (!landlordInfo) {
            // Get tenancy to find property owner
            const tenanciesData = await apiFetch<PaginatedResponse<Tenancy>>(
              buildPaginatedPath(endpoints.tenancies, { pageSize: 200 })
            );
            const tenancy = tenanciesData.results.find(t => t.id === invoice.tenancy);
            
            if (tenancy) {
              // Get room to find property
              const roomsData = await apiFetch<PaginatedResponse<Room>>(
                buildPaginatedPath(endpoints.rooms, { pageSize: 200 })
              );
              const room = roomsData.results.find(r => r.id === tenancy.room);
              
              if (room) {
                // Get property to find owner
                const propertiesData = await apiFetch<PaginatedResponse<Property>>(
                  buildPaginatedPath(endpoints.properties, { pageSize: 200 })
                );
                const property = propertiesData.results.find(p => p.id === room.building);
                
                if (property) {
                  // Get landlord user
                  const usersData = await apiFetch<PaginatedResponse<UserType>>(
                    buildPaginatedPath(endpoints.users, { pageSize: 200 })
                  );
                  const landlord = usersData.results.find(u => u.id === property.owner);
                  if (landlord) {
                    setLandlordInfo(landlord);
                  }
                }
              }
            }
          }
          
          // Get QR code with invoice_id so backend can get landlord from invoice
          const amount = paymentAmount ? parseFloat(paymentAmount) : invoice.amount_due;
          const addInfo = `INV${invoice.id.slice(0, 8).toUpperCase()}`;
          
          const qrResponse = await apiFetch<QRCodeResponse>(
            `${endpoints.qrCode}?invoice_id=${invoice.id}&amount=${amount}&addInfo=${encodeURIComponent(addInfo)}`
          );
          setQrCodeData(qrResponse);
        } catch (err: unknown) {
          console.error("Failed to load QR code:", err);
          // Don't show error, just don't display QR code
          setQrCodeData(null);
        } finally {
          setLoadingQR(false);
        }
      };
      
      loadQRCode();
    } else {
      setQrCodeData(null);
    }
  }, [paymentMethod, showPaymentModal, invoice, paymentAmount, isTenant, landlordInfo]);

  const handleCopyAccountNumber = () => {
    if (qrCodeData?.accountNumber) {
      navigator.clipboard.writeText(qrCodeData.accountNumber);
      message.success("Đã sao chép số tài khoản!");
    }
  };

  const handleDownloadInvoice = async () => {
    try {
      const token = getAuthToken();
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api"}${endpoints.invoices}${invoiceId}/download/`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Không thể tải xuống hóa đơn");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Hoa-don-${invoice.period}-${invoiceId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Không thể tải xuống hóa đơn";
      setError(message);
    }
  };

  const handleEditInvoice = () => {
    router.push(`/invoices/${invoiceId}/edit`);
  };

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoice) return;

    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      setError("Số tiền không hợp lệ");
      return;
    }

    setSubmittingPayment(true);
    setError(null);

    try {
      await apiFetch(endpoints.payments, {
        method: "POST",
        body: JSON.stringify({
          invoice: invoice.id,
          amount: amount,
          method: paymentMethod,
          status: "completed",
          note: paymentNote || "",
        }),
      });

      // Reload data
      const [invoiceData, paymentsData] = await Promise.all([
        apiFetch<Invoice>(`${endpoints.invoices}${invoiceId}/`),
        apiFetch<PaginatedResponse<Payment>>(buildPaginatedPath(endpoints.payments, { pageSize: 200 })),
      ]);

      setInvoice(invoiceData);
      setPayments((paymentsData.results || []).filter((p) => p.invoice === invoiceId));
      handleClosePaymentModal();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Không thể ghi nhận thanh toán";
      setError(message);
    } finally {
      setSubmittingPayment(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="h-8 w-48 bg-border-dark rounded animate-pulse mb-8" />
        <div className="max-w-4xl space-y-6">
          <div className="h-64 bg-white rounded-xl animate-pulse" />
          <div className="h-48 bg-white rounded-xl animate-pulse" />
        </div>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="p-6 lg:p-8">
        <div className="text-center py-12">
          <ExclamationCircleOutlined className="w-16 h-16 mx-auto mb-4 text-red-400" />
          <p className="text-red-400 text-lg">{error || "Không tìm thấy hóa đơn"}</p>
          <Link href="/invoices" className="text-primary hover:underline mt-4 inline-block">
            Quay lại danh sách
          </Link>
        </div>
      </div>
    );
  }

  const tenancy = tenancies.find((t) => t.id === invoice.tenancy);
  const room = tenancy ? rooms.find((r) => r.id === tenancy.room) : null;
  const property = room ? properties.find((p) => p.id === room.building) : null;
  const tenant = tenancy ? users.find((u) => u.id === tenancy.tenant) : null;
  
  // For tenants, get room info from tenancy if available
  let tenantRoom = null;
  let tenantProperty = null;
  if (isTenant && invoice) {
    // Try to get room info from tenancy if we have it
    const tenantTenancy = tenancies.find((t) => t.id === invoice.tenancy);
    if (tenantTenancy) {
      tenantRoom = rooms.find((r) => r.id === tenantTenancy.room);
      tenantProperty = tenantRoom ? properties.find((p) => p.id === tenantRoom.building) : null;
    }
  }

  const StatusIcon = statusConfig[invoice.status]?.icon || FileTextOutlined;
  const totalPaid = payments
    .filter((p) => p.status === "completed")
    .reduce((sum, p) => sum + Number(p.amount), 0);

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <motion.div
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <ArrowLeftOutlined className="w-5 h-5 text-[#475569]" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <h1 className="font-[family-name:var(--font-poppins)] text-xl sm:text-2xl lg:text-3xl font-bold text-[#0F172A]">
                Hóa đơn {invoice.period}
              </h1>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full border whitespace-nowrap shrink-0 ${
                  statusConfig[invoice.status]?.color || statusConfig.draft.color
                }`}
              >
                <StatusIcon className="w-3.5 h-3.5 shrink-0" />
                {statusConfig[invoice.status]?.label || invoice.status}
              </span>
            </div>
            <p className="text-sm sm:text-base text-[#475569] mt-1">
              Tạo ngày {new Date(invoice.created_at).toLocaleDateString("vi-VN")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <button
            onClick={handleDownloadInvoice}
            className="p-2.5 hover:bg-gray-100 rounded-lg transition-colors border border-[#E2E8F0] min-h-[44px] min-w-[44px] flex items-center justify-center"
            title="Tải xuống PDF"
          >
            <DownloadOutlined className="w-5 h-5 text-[#475569]" />
          </button>
          {!isTenant && (
            <button
              onClick={handleEditInvoice}
              disabled={invoice.status === "paid"}
              className={`p-2.5 rounded-lg transition-colors border border-[#E2E8F0] min-h-[44px] min-w-[44px] flex items-center justify-center ${
                invoice.status === "paid"
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:bg-gray-100"
              }`}
              title={invoice.status === "paid" ? "Không thể chỉnh sửa hóa đơn đã thanh toán" : "Chỉnh sửa hóa đơn"}
            >
              <EditOutlined className="w-5 h-5 text-[#475569]" />
            </button>
          )}
          {invoice.status !== "paid" && (
            <button
              onClick={handleOpenPaymentModal}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-white font-semibold rounded-lg hover:bg-primary/90 transition-colors min-h-[44px] whitespace-nowrap flex-1 sm:flex-initial"
            >
              <CreditCard className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">{isTenant ? "Thanh toán" : "Ghi nhận thanh toán"}</span>
              <span className="sm:hidden">Thanh toán</span>
            </button>
          )}
        </div>
      </motion.div>

      <div className="w-full grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Tenant Info - Only show for landlords */}
          {!isTenant && (
            <motion.div
              className="bg-white border border-[#E2E8F0] rounded-xl p-6 hover:border-primary/30 transition-colors"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <h2 className="text-lg font-semibold text-[#0F172A] mb-4 flex items-center gap-2">
                <UserOutlined className="w-5 h-5 text-primary" />
                Thông tin khách thuê
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <UserOutlined className="w-7 h-7 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-[#0F172A] mb-1">{tenant?.full_name || "N/A"}</h3>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm text-[#475569]">
                        <MailOutlined className="w-4 h-4 shrink-0" />
                        <span className="truncate">{tenant?.email || "N/A"}</span>
                      </div>
                      {tenant?.phone && (
                        <div className="flex items-center gap-2 text-sm text-[#475569]">
                          <PhoneOutlined className="w-4 h-4 shrink-0" />
                          <span>{tenant.phone}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
                    <HomeOutlined className="w-7 h-7 text-blue-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-[#0F172A] mb-1">Phòng {room?.room_number || "N/A"}</h3>
                    <p className="text-sm text-[#475569]">{property?.name || "N/A"}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Invoice Lines - Desktop Table */}
          <motion.div
            className="hidden md:block bg-white border border-[#E2E8F0] rounded-xl overflow-hidden"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="p-6 border-b border-[#E2E8F0] bg-[#F8FAFC]">
              <h2 className="text-lg font-semibold text-[#0F172A] flex items-center gap-2">
                <FileTextOutlined className="w-5 h-5 text-primary" />
                Chi tiết hóa đơn
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-xs text-[#475569] uppercase tracking-wider border-b border-[#E2E8F0] bg-[#F8FAFC]">
                    <th className="px-6 py-4 font-semibold">Khoản mục</th>
                    <th className="px-6 py-4 font-semibold text-right">Số lượng</th>
                    <th className="px-6 py-4 font-semibold text-right">Đơn giá</th>
                    <th className="px-6 py-4 font-semibold text-right">Thành tiền</th>
                  </tr>
                </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {invoice.lines && invoice.lines.length > 0 ? (
                  invoice.lines.map((line, index) => (
                    <tr key={`invoice-line-${line.id || index}-${index}`} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="text-sm font-medium text-[#0F172A]">
                          {itemTypeLabels[line.item_type] || line.item_type}
                        </p>
                        {line.description && (
                          <p className="text-sm text-[#475569] mt-1">{line.description}</p>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right text-sm text-[#475569]">
                        {Number(line.quantity).toLocaleString("vi-VN")}
                      </td>
                      <td className="px-6 py-4 text-right text-sm text-[#475569]">
                        {Number(line.unit_price).toLocaleString("vi-VN")}đ
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-semibold text-[#0F172A]">
                        {Number(line.amount).toLocaleString("vi-VN")}đ
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-[#475569]">
                      Không có chi tiết
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot className="border-t-2 border-[#E2E8F0] bg-[#F8FAFC]">
                <tr>
                  <td colSpan={3} className="px-6 py-4 text-lg font-semibold text-[#0F172A]">
                    Tổng cộng
                  </td>
                  <td className="px-6 py-4 text-right text-xl font-bold text-primary">
                    {invoice.lines && invoice.lines.length > 0
                      ? invoice.lines
                          .reduce((sum, line) => sum + Number(line.amount), 0)
                          .toLocaleString("vi-VN") + "đ"
                      : Number(invoice.total_amount).toLocaleString("vi-VN") + "đ"}
                  </td>
                </tr>
                {totalPaid > 0 && (
                  <>
                    <tr>
                      <td colSpan={3} className="px-6 py-3 text-right text-[#475569]">
                        Đã thanh toán
                      </td>
                      <td className="px-6 py-3 text-right text-green-500 font-semibold">
                        {totalPaid.toLocaleString("vi-VN")}đ
                      </td>
                    </tr>
                    <tr>
                      <td colSpan={3} className="px-6 py-4 text-lg font-semibold text-[#0F172A]">
                        Còn lại
                      </td>
                      <td className="px-6 py-4 text-right text-xl font-bold text-orange-500">
                        {Number(invoice.amount_due).toLocaleString("vi-VN")}đ
                      </td>
                    </tr>
                  </>
                )}
              </tfoot>
              </table>
            </div>
          </motion.div>

          {/* Invoice Lines - Mobile Cards */}
          <motion.div
            className="md:hidden bg-white border border-[#E2E8F0] rounded-xl overflow-hidden"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="p-4 sm:p-6 border-b border-[#E2E8F0] bg-[#F8FAFC]">
              <h2 className="text-base sm:text-lg font-semibold text-[#0F172A] flex items-center gap-2">
                <FileTextOutlined className="w-5 h-5 text-primary" />
                Chi tiết hóa đơn
              </h2>
            </div>
            <div className="divide-y divide-[#E2E8F0]">
              {invoice.lines && invoice.lines.length > 0 ? (
                <>
                  {invoice.lines.map((line, index) => (
                    <div key={`invoice-line-${line.id || index}-${index}`} className="p-4 sm:p-6">
                      <div className="mb-3">
                        <p className="text-base font-semibold text-[#0F172A]">
                          {itemTypeLabels[line.item_type] || line.item_type}
                        </p>
                        {line.description && (
                          <p className="text-sm text-[#475569] mt-1">{line.description}</p>
                        )}
                      </div>
                      <div className="grid grid-cols-3 gap-3 text-sm">
                        <div>
                          <div className="text-xs font-medium text-[#64748B] mb-1">Số lượng</div>
                          <div className="text-[#475569]">{Number(line.quantity).toLocaleString("vi-VN")}</div>
                        </div>
                        <div>
                          <div className="text-xs font-medium text-[#64748B] mb-1">Đơn giá</div>
                          <div className="text-[#475569]">{Number(line.unit_price).toLocaleString("vi-VN")}đ</div>
                        </div>
                        <div>
                          <div className="text-xs font-medium text-[#64748B] mb-1">Thành tiền</div>
                          <div className="font-semibold text-[#0F172A]">{Number(line.amount).toLocaleString("vi-VN")}đ</div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {/* Summary */}
                  <div className="p-4 sm:p-6 bg-[#F8FAFC] space-y-3 border-t-2 border-[#E2E8F0]">
                    <div className="flex justify-between items-center">
                      <span className="text-base font-semibold text-[#0F172A]">Tổng cộng</span>
                      <span className="text-lg font-bold text-primary">
                        {invoice.lines && invoice.lines.length > 0
                          ? invoice.lines
                              .reduce((sum, line) => sum + Number(line.amount), 0)
                              .toLocaleString("vi-VN") + "đ"
                          : Number(invoice.total_amount).toLocaleString("vi-VN") + "đ"}
                      </span>
                    </div>
                    {totalPaid > 0 && (
                      <>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-[#475569]">Đã thanh toán</span>
                          <span className="text-sm font-semibold text-green-500">
                            {totalPaid.toLocaleString("vi-VN")}đ
                          </span>
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t border-[#E2E8F0]">
                          <span className="text-base font-semibold text-[#0F172A]">Còn lại</span>
                          <span className="text-lg font-bold text-orange-500">
                            {Number(invoice.amount_due).toLocaleString("vi-VN")}đ
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </>
              ) : (
                <div className="p-8 text-center text-[#475569]">
                  Không có chi tiết
                </div>
              )}
            </div>
          </motion.div>

          {/* Notes */}
          {invoice.notes && (
            <motion.div
              className="bg-white border border-[#E2E8F0] rounded-xl p-6 hover:border-primary/30 transition-colors"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h2 className="text-lg font-semibold text-[#0F172A] mb-3">Ghi chú</h2>
              <p className="text-[#475569] leading-relaxed">{invoice.notes}</p>
            </motion.div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Payment Summary */}
          <motion.div
            className="bg-white border border-[#E2E8F0] rounded-xl p-6 hover:border-primary/30 transition-colors"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <h3 className="text-lg font-semibold text-[#0F172A] mb-4 flex items-center gap-2">
              <WalletOutlined className="w-5 h-5 text-primary" />
              Tóm tắt
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-[#475569]">Kỳ thanh toán</span>
                <span className="text-sm font-medium text-[#0F172A]">{invoice.period}</span>
              </div>
              {invoice.due_date && (
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-[#475569]">Hạn thanh toán</span>
                  <span className="text-sm font-medium text-[#0F172A]">
                    {new Date(invoice.due_date).toLocaleDateString("vi-VN")}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-[#475569]">Tổng tiền</span>
                <span className="text-sm font-semibold text-[#0F172A]">
                  {invoice.lines && invoice.lines.length > 0
                    ? invoice.lines
                        .reduce((sum, line) => sum + Number(line.amount), 0)
                        .toLocaleString("vi-VN") + "đ"
                    : Number(invoice.total_amount).toLocaleString("vi-VN") + "đ"}
                </span>
              </div>
              {totalPaid > 0 && (
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-[#475569]">Đã thanh toán</span>
                  <span className="text-sm font-semibold text-green-500">
                    {totalPaid.toLocaleString("vi-VN")}đ
                  </span>
                </div>
              )}
              <div className="pt-4 border-t-2 border-[#E2E8F0] flex items-center justify-between">
                <span className="text-base font-semibold text-[#0F172A]">Còn nợ</span>
                <span className="text-2xl font-bold text-primary">
                  {Number(invoice.amount_due).toLocaleString("vi-VN")}đ
                </span>
              </div>
            </div>
          </motion.div>

          {/* Payment History */}
          <motion.div
            className="bg-white border border-[#E2E8F0] rounded-xl p-6 hover:border-primary/30 transition-colors"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h3 className="text-lg font-semibold text-[#0F172A] mb-4 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary" />
              Lịch sử thanh toán
            </h3>
            {payments.length === 0 ? (
              <div className="text-center py-8">
                <CreditCard className="w-12 h-12 mx-auto mb-3 text-[#64748B] opacity-50" />
                <p className="text-[#475569] text-sm">Chưa có thanh toán nào</p>
              </div>
            ) : (
              <div className="space-y-3">
                {payments.map((payment) => (
                  <div key={payment.id} className="p-4 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0] hover:border-primary/30 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-lg font-semibold text-[#0F172A]">
                        {Number(payment.amount).toLocaleString("vi-VN")}đ
                      </span>
                      <span
                        className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                          payment.status === "completed"
                            ? "bg-green-500/20 text-green-500 border border-green-500/30"
                            : "bg-orange-500/20 text-orange-500 border border-orange-500/30"
                        }`}
                      >
                        {payment.status === "completed" ? "Thành công" : "Chờ xử lý"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 text-[#475569]">
                        <CalendarOutlined className="w-4 h-4" />
                        <span>{new Date(payment.created_at).toLocaleDateString("vi-VN")}</span>
                      </div>
                      <span className="text-[#64748B]">
                        {new Date(payment.created_at).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    {payment.method && (
                      <div className="mt-2 text-xs text-[#64748B]">
                        Phương thức: {payment.method}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto"
          onClick={handleClosePaymentModal}
        >
          <motion.div
            className="bg-white border border-[#E2E8F0] rounded-xl max-w-md w-full p-4 sm:p-6 my-auto max-h-[90vh] overflow-y-auto"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                </div>
                <h2 className="text-base sm:text-lg font-semibold text-[#0F172A]">Ghi nhận thanh toán</h2>
              </div>
              <button
                onClick={handleClosePaymentModal}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <X className="w-5 h-5 text-[#475569]" />
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmitPayment} className="space-y-3 sm:space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#475569] mb-2">
                  Số tiền *
                </label>
                <InputNumber
                  value={paymentAmount ? parseFloat(paymentAmount) : undefined}
                  onChange={(value) => setPaymentAmount(value?.toString() || "")}
                  step={0.01}
                  min={0}
                  placeholder="Nhập số tiền"
                  style={{ width: '100%' }}
                  required
                />
                <p className="text-xs text-[#475569] mt-1">
                  Còn nợ: {Number(invoice.amount_due).toLocaleString("vi-VN")}đ
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#475569] mb-2">
                  Phương thức thanh toán *
                </label>
                <Select 
                  className="w-full bg-white" 
                  placeholder="Chọn phương thức"
                  value={paymentMethod}
                  onChange={(value) => setPaymentMethod(value)}
                  size="large"
                >
                    <Select.Option value="cash">Tiền mặt</Select.Option>
                    <Select.Option value="bank_transfer">Chuyển khoản</Select.Option>
                    <Select.Option value="momo">MoMo</Select.Option>
                    <Select.Option value="vnpay">VNPay</Select.Option>
                    <Select.Option value="other">Khác</Select.Option>
                  </Select>
              </div>

              {/* QR Code Display for bank_transfer or momo */}
              {isTenant && (paymentMethod === "bank_transfer" || paymentMethod === "momo") && (
                <div className="border-t border-[#E2E8F0] pt-3 sm:pt-4">
                  {loadingQR ? (
                    <div className="flex items-center justify-center py-6 sm:py-8">
                      <LoadingOutlined className="w-5 h-5 sm:w-6 sm:h-6 animate-spin text-primary" />
                      <span className="ml-2 text-sm text-[#475569]">Đang tạo mã QR...</span>
                    </div>
                  ) : qrCodeData ? (
                    <motion.div
                      className="bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 rounded-xl p-3 sm:p-4 space-y-3 sm:space-y-4"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <div className="flex items-center gap-2 mb-2 sm:mb-3">
                        <QrcodeOutlined className="w-4 h-4 sm:w-5 sm:h-5 text-primary shrink-0" />
                        <h3 className="text-sm sm:text-base font-semibold text-[#0F172A]">Quét mã QR để thanh toán</h3>
                      </div>
                      
                      <div className="flex justify-center">
                        <div className="bg-white p-2 sm:p-3 rounded-lg border-2 border-primary/20">
                          <img
                            src={qrCodeData.qrUrl}
                            alt="QR Code"
                            className="w-32 h-32 sm:w-40 sm:h-40 md:w-48 md:h-48"
                            onError={(e) => {
                              console.error("QR code image failed to load");
                              e.currentTarget.style.display = "none";
                            }}
                          />
                        </div>
                      </div>
                      
                      {/* Compact info layout - grid on larger screens, stacked on mobile */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 text-center">
                        <div className="bg-white/60 rounded-lg p-2 sm:p-2.5">
                          <p className="text-[10px] sm:text-xs text-[#64748B] mb-0.5 sm:mb-1">Ngân hàng</p>
                          <p className="text-xs sm:text-sm font-semibold text-[#0F172A] line-clamp-2">{qrCodeData.bankName}</p>
                        </div>
                        <div className="bg-white/60 rounded-lg p-2 sm:p-2.5">
                          <p className="text-[10px] sm:text-xs text-[#64748B] mb-0.5 sm:mb-1">Số tài khoản</p>
                          <div className="flex items-center justify-center gap-1.5">
                            <p className="text-xs sm:text-sm font-semibold text-[#0F172A] break-all">{qrCodeData.accountNumber}</p>
                            <button
                              onClick={handleCopyAccountNumber}
                              className="p-1 hover:bg-primary/10 rounded transition-colors cursor-pointer shrink-0 min-h-[32px] min-w-[32px] flex items-center justify-center"
                              title="Sao chép số tài khoản"
                            >
                              <CopyOutlined className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
                            </button>
                          </div>
                        </div>
                        {paymentAmount && (
                          <div className="bg-white/60 rounded-lg p-2 sm:p-2.5">
                            <p className="text-[10px] sm:text-xs text-[#64748B] mb-0.5 sm:mb-1">Số tiền</p>
                            <p className="text-sm sm:text-base font-bold text-primary">
                              {Number(paymentAmount).toLocaleString("vi-VN")}đ
                            </p>
                          </div>
                        )}
                      </div>
                      
                      <p className="text-[10px] sm:text-xs text-[#64748B] text-center mt-2 sm:mt-3">
                        Quét mã QR bằng ứng dụng ngân hàng hoặc MoMo để thanh toán
                      </p>
                    </motion.div>
                  ) : (
                    <div className="p-3 sm:p-4 bg-orange-500/10 border border-orange-500/30 rounded-lg text-orange-600 text-xs sm:text-sm text-center">
                      Chủ trọ chưa cấu hình thông tin ngân hàng. Vui lòng liên hệ chủ trọ để thanh toán.
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-[#475569] mb-2">
                  Ghi chú
                </label>
                <Input.TextArea
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value)}
                  rows={2}
                  placeholder="Nhập ghi chú (tùy chọn)"
                  className="resize-none"
                />
              </div>

              <div className="flex items-center gap-2 sm:gap-3 pt-3 sm:pt-4">
                <button
                  type="button"
                  onClick={handleClosePaymentModal}
                  className="flex-1 px-4 py-2.5 border border-[#E2E8F0] text-[#475569] rounded-lg hover:bg-gray-100 transition-colors min-h-[44px]"
                  disabled={submittingPayment}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-primary text-white font-semibold rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
                  disabled={submittingPayment}
                >
                  {submittingPayment ? "Đang xử lý..." : "Xác nhận"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
