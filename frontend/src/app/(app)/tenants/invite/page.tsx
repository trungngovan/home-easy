"use client";

import { useEffect, useState } from "react";
import { apiFetch, endpoints, clearAuthToken, getAuthToken, PaginatedResponse, buildPaginatedPath } from "@/lib/api";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowLeftOutlined, BuildOutlined, CalendarOutlined, CheckCircleOutlined, FileTextOutlined, HomeOutlined, LoadingOutlined, MailOutlined, PhoneOutlined, SendOutlined } from '@ant-design/icons'
import { UserPlus, Copy,  } from 'lucide-react';
import { Select, Input, DatePicker } from "antd";
import dayjs from "dayjs";

type Property = {
  id: string;
  name: string;
};

type Room = {
  id: string;
  building: string;
  room_number: string;
  status: string;
};

// Helper function to parse API errors
function parseInviteError(err: unknown): string {
  if (!(err instanceof Error)) {
    return "Không thể tạo lời mời. Vui lòng thử lại.";
  }

  const message = err.message;
  
  // Try to extract JSON from error message (format: "API error 400: {...}")
  const jsonMatch = message.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const errorData = JSON.parse(jsonMatch[0]);
      
      // Check for field-specific errors (e.g., email, phone)
      if (errorData.email && Array.isArray(errorData.email)) {
        return errorData.email[0];
      }
      if (errorData.phone && Array.isArray(errorData.phone)) {
        return errorData.phone[0];
      }
      
      // Check for non_field_errors
      if (errorData.non_field_errors && Array.isArray(errorData.non_field_errors)) {
        return errorData.non_field_errors[0];
      }
      
      // Check for detail field
      if (errorData.detail) {
        return typeof errorData.detail === "string" ? errorData.detail : errorData.detail[0];
      }
      
      // Check for any other field errors
      const errorFields = Object.keys(errorData);
      if (errorFields.length > 0) {
        const firstError = errorData[errorFields[0]];
        if (Array.isArray(firstError) && firstError.length > 0) {
          return firstError[0];
        }
        if (typeof firstError === "string") {
          return firstError;
        }
      }
    } catch {
      // If JSON parsing fails, continue with default handling
    }
  }
  
  // Default error message
  if (message.includes("400")) {
    return "Thông tin không hợp lệ. Vui lòng kiểm tra lại email/số điện thoại và đảm bảo người thuê đã đăng ký tài khoản.";
  }
  
  return message || "Không thể tạo lời mời. Vui lòng thử lại.";
}

export default function InviteTenantPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roomIdFromQuery = searchParams.get("room");
  const [properties, setProperties] = useState<Property[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Form state
  const [selectedProperty, setSelectedProperty] = useState<string>("");
  const [selectedRoom, setSelectedRoom] = useState<string>("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [sendMethod, setSendMethod] = useState<"email" | "sms" | "link">("email");
  const [contractFile, setContractFile] = useState<File | null>(null);
  const [contractFileId, setContractFileId] = useState<string | null>(null);
  const [uploadingContract, setUploadingContract] = useState(false);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [propsData, roomsData] = await Promise.all([
          apiFetch<PaginatedResponse<Property>>(buildPaginatedPath(endpoints.properties, { pageSize: 200 })),
          apiFetch<PaginatedResponse<Room>>(buildPaginatedPath(endpoints.rooms, { pageSize: 200 })),
        ]);
        setProperties(propsData.results || []);
        setRooms(roomsData.results || []);
        
        // Auto-select room if room ID is provided in query params
        if (roomIdFromQuery && roomsData.results) {
          const room = roomsData.results.find((r) => r.id === roomIdFromQuery);
          if (room) {
            setSelectedRoom(roomIdFromQuery);
            setSelectedProperty(room.building);
          }
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Không thể tải dữ liệu";
        setError(message);
      } finally {
        setLoading(false);
      }
    }
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, roomIdFromQuery]);

  // Filter rooms by selected property and vacant status
  const availableRooms = rooms.filter(
    (r) => r.building === selectedProperty && r.status === "vacant"
  );

  const handleContractFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate PDF
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setError("Chỉ chấp nhận file PDF cho hợp đồng");
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError("File không được vượt quá 10MB");
      return;
    }

    setContractFile(file);
    setUploadingContract(true);
    setError(null);

    try {
      // Upload file first
      const formData = new FormData();
      formData.append("file", file);
      formData.append("purpose", "contract");

      const token = getAuthToken();
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api"}/files/`, {
        method: "POST",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Không thể upload file");
      }

      const fileData = await response.json();
      setContractFileId(fileData.id);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Không thể upload file hợp đồng";
      setError(message);
      setContractFile(null);
    } finally {
      setUploadingContract(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoom) {
      setError("Vui lòng chọn phòng");
      return;
    }

    if (sendMethod === "email" && !email) {
      setError("Vui lòng nhập email");
      return;
    }

    if (sendMethod === "sms" && !phone) {
      setError("Vui lòng nhập số điện thoại");
      return;
    }

    if (!contractFileId) {
      setError("Vui lòng upload hợp đồng thuê. Hợp đồng là bắt buộc để đảm bảo pháp lý và bảo vệ người thuê.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await apiFetch<{ token: string }>(endpoints.invites, {
        method: "POST",
        body: JSON.stringify({
          property: selectedProperty,
          room: selectedRoom,
          email: email || null,
          phone: phone || null,
          role: "tenant",
          contract_file_id: contractFileId || null,
          expires_at: expiresAt || null,
        }),
      });

      setSuccess(true);
      // Generate invite link (this would be the actual link in production)
      const baseUrl = window.location.origin;
      setInviteLink(`${baseUrl}/invite/${response.token}`);
    } catch (err: unknown) {
      const message = parseInviteError(err);
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const copyToClipboard = () => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="h-8 w-48 bg-border-dark rounded animate-pulse mb-8" />
        <div className="w-full">
          <div className="h-96 bg-white rounded-xl animate-pulse" />
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="p-6 lg:p-8">
        <motion.div
          className="w-full mx-auto text-center"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
              <CheckCircleOutlined className="w-8 h-8 text-green-400" />
            </div>
            <h2 >Lời mời đã được tạo!</h2>
            <p className="text-[#475569] mb-6">
              {sendMethod === "link"
                ? "Chia sẻ link bên dưới cho khách thuê"
                : `Lời mời đã được gửi đến ${sendMethod === "email" ? email : phone}`}
            </p>

            {inviteLink && (
              <div className="mb-6">
                <div className="flex items-center gap-2 p-3 bg-white rounded-lg">
                  <Input
                    type="text"
                    value={inviteLink}
                    readOnly
                  />
                  <button
                    onClick={copyToClipboard}
                    className="p-2 hover:bg-gray-100 rounded transition-colors"
                  >
                    {copied ? (
                      <CheckCircleOutlined className="w-5 h-5 text-green-400" />
                    ) : (
                      <Copy className="w-5 h-5 text-[#475569]" />
                    )}
                  </button>
                </div>
              </div>
            )}

            <div className="flex items-center justify-center gap-3">
              <Link
                href="/tenants" >
                Quay lại danh sách
              </Link>
              <button
                onClick={() => {
                  setSuccess(false);
                  setInviteLink(null);
                  setEmail("");
                  setPhone("");
                  setSelectedRoom("");
                }}
                className="px-6 py-2.5 bg-primary text-bg-dark font-semibold rounded-lg hover:bg-primary/90 transition-colors"
              >
                Mời thêm người
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <motion.div
        className="flex items-center gap-4 mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <button
          onClick={() => router.back()}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeftOutlined className="w-5 h-5 text-[#475569]" />
        </button>
        <div>
          <h1 className="font-[family-name:var(--font-poppins)] text-2xl lg:text-3xl font-bold text-[#0F172A]">
            Mời khách thuê
          </h1>
          <p className="text-[#475569] mt-1">Gửi lời mời cho khách thuê mới</p>
        </div>
      </motion.div>

      {error && (
        <motion.div
          className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 w-full"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {error}
        </motion.div>
      )}

      <form onSubmit={handleSubmit} className="w-full">
        <motion.div
          className="space-y-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* Room Selection */}
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-6">
            <h2 className="text-lg font-semibold text-[#0F172A] mb-4 flex items-center gap-2">
              <HomeOutlined className="w-5 h-5 text-primary" />
              Chọn phòng
            </h2>

            <div className="space-y-4">
              {/* Property Select */}
              <div>
                <label className="block text-sm font-medium text-[#475569] mb-2">
                  Tài sản *
                </label>
                <Select
                  className="w-full h-12 bg-white"
                  placeholder="Chọn tài sản"
                  value={selectedProperty || undefined}
                  onChange={(value) => {
                    setSelectedProperty(value);
                    setSelectedRoom("");
                  }}
                  showSearch={false}
                >
                  {properties.map((p) => (
                    <Select.Option key={p.id} value={p.id}>
                      {p.name}
                    </Select.Option>
                  ))}
                </Select>
              </div>

              {/* Room Select */}
              <div>
                <label className="block text-sm font-medium text-[#475569] mb-2">
                  Phòng trống *
                </label>
                <Select
                  className="w-full h-12 bg-white"
                  placeholder="Chọn phòng"
                  value={selectedRoom || undefined}
                  onChange={(value) => setSelectedRoom(value)}
                  disabled={!selectedProperty}
                  showSearch={false}
                >
                  {availableRooms.map((r) => (
                    <Select.Option key={r.id} value={r.id}>
                      Phòng {r.room_number}
                    </Select.Option>
                  ))}
                </Select>
                {selectedProperty && availableRooms.length === 0 && (
                  <p className="text-sm text-orange-400 mt-2">
                    Không có phòng trống trong tài sản này
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Send Method */}
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-6">
            <h2 className="text-lg font-semibold text-[#0F172A] mb-4 flex items-center gap-2">
              <SendOutlined className="w-5 h-5 text-primary" />
              Phương thức gửi
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4 w-full">
              {[
                { value: "email", label: "Email", icon: MailOutlined },
                { value: "sms", label: "SMS", icon: PhoneOutlined },
                { value: "link", label: "Lấy link", icon: Copy },
              ].map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setSendMethod(value as "email" | "sms" | "link")}
                  className={`p-4 rounded-lg border transition-colors flex flex-col items-center gap-2 min-h-[44px] ${
                    sendMethod === value
                      ? "bg-primary/10 border-primary text-primary"
                      : "bg-white border-[#E2E8F0] text-[#475569] hover:border-primary/30"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-sm font-medium">{label}</span>
                </button>
              ))}
            </div>

            {sendMethod === "email" && (
              <div>
                <label className="block text-sm font-medium text-[#475569] mb-2">
                  Email khách thuê *
                </label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@example.com"
                  required={sendMethod === "email"}
                />
              </div>
            )}

            {sendMethod === "sms" && (
              <div>
                <label className="block text-sm font-medium text-[#475569] mb-2">
                  Số điện thoại *
                </label>
                <Input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0912345678"
                  required={sendMethod === "sms"}
                />
              </div>
            )}

            {sendMethod === "link" && (
              <p className="text-sm text-[#475569]">
                Sau khi tạo, bạn sẽ nhận được một link để chia sẻ cho khách thuê.
              </p>
            )}
          </div>

          {/* Contract Upload */}
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-6">
            <h2 className="text-lg font-semibold text-[#0F172A] mb-4 flex items-center gap-2">
              <FileTextOutlined className="w-5 h-5 text-primary" />
              Hợp đồng thuê (PDF) *
            </h2>
            <p className="text-sm text-[#475569] mb-4">
              Upload hợp đồng thuê nhà dạng PDF để đảm bảo pháp lý và bảo vệ người thuê (bắt buộc)
            </p>
            <div>
              <label className="block text-sm font-medium text-[#475569] mb-2">
                File hợp đồng (PDF, tối đa 10MB) *
              </label>
              <div className="relative">
                <input
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={handleContractFileChange}
                  className="hidden"
                  id="contract-file-input"
                  disabled={uploadingContract}
                />
                <label
                  htmlFor="contract-file-input"
                  className={`flex items-center gap-3 p-4 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                    contractFile
                      ? "border-primary bg-primary/10"
                      : "border-[#E2E8F0] bg-white hover:border-primary/40"
                  } ${uploadingContract ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  {uploadingContract ? (
                    <>
                      <LoadingOutlined className="w-5 h-5 text-primary animate-spin" />
                      <span className="text-[#475569]">Đang upload...</span>
                    </>
                  ) : contractFile ? (
                    <>
                      <FileTextOutlined className="w-5 h-5 text-primary" />
                      <span >{contractFile.name}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setContractFile(null);
                          setContractFileId(null);
                          const input = document.getElementById("contract-file-input") as HTMLInputElement;
                          if (input) input.value = "";
                        }}
                        className="text-red-400 hover:text-red-300 ml-2"
                      >
                        Xóa
                      </button>
                    </>
                  ) : (
                    <>
                      <FileTextOutlined className="w-5 h-5 text-[#475569]" />
                      <span className="text-[#475569]">Chọn file PDF</span>
                    </>
                  )}
                </label>
              </div>
              {contractFileId && (
                <p className="text-xs text-green-400 mt-2">✓ File đã được upload thành công</p>
              )}
            </div>
          </div>

          {/* Expires At */}
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-6">
            <h2 className="text-lg font-semibold text-[#0F172A] mb-4 flex items-center gap-2">
              <CalendarOutlined className="w-5 h-5 text-primary" />
              Ngày hết hạn
            </h2>
            <p className="text-sm text-[#475569] mb-4">
              Lời mời sẽ tự động hết hạn sau thời gian này (tùy chọn)
            </p>
            <div>
              <label className="block text-sm font-medium text-[#475569] mb-2">
                Ngày và giờ hết hạn
              </label>
              <DatePicker
                showTime
                value={expiresAt ? dayjs(expiresAt) : null}
                onChange={(date) => {
                  setExpiresAt(date ? date.toISOString() : null);
                }}
                format="DD/MM/YYYY HH:mm"
                placeholder="Chọn ngày và giờ hết hạn"
                className="w-full"
                style={{ width: '100%' }}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3">
            <Link
              href="/tenants"
              className="flex items-center justify-center px-6 py-2.5 border border-[#E2E8F0] text-[#475569] font-semibold rounded-lg hover:bg-gray-50 transition-colors min-h-[44px]"
            >
              Hủy
            </Link>
            <button
              type="submit"
              disabled={submitting || !selectedRoom || !contractFileId}
              className="flex items-center justify-center gap-2 px-6 py-2.5 bg-primary text-bg-dark font-semibold rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 min-h-[44px]"
            >
              {submitting ? (
                <>
                  <LoadingOutlined className="w-4 h-4 animate-spin" />
                  Đang gửi...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  Gửi lời mời
                </>
              )}
            </button>
          </div>
        </motion.div>
      </form>
    </div>
  );
}
