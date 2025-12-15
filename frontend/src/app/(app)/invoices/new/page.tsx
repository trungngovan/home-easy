"use client";

import { useEffect, useState } from "react";
import { apiFetch, endpoints, clearAuthToken, PaginatedResponse, buildPaginatedPath } from "@/lib/api";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowLeftOutlined, CalendarOutlined, DeleteOutlined, FileTextOutlined, HomeOutlined, LoadingOutlined, PlusOutlined } from '@ant-design/icons'
import { Calculator,  } from 'lucide-react';
import { DatePicker, Input, InputNumber, Select } from "antd";
import dayjs from "dayjs";

type Property = {
  id: string;
  name: string;
};

type Room = {
  id: string;
  building: string;
  room_number: string;
  base_rent: number;
};

type Tenancy = {
  id: string;
  room: string;
  tenant: string;
  status: string;
  base_rent: number;
};

type User = {
  id: string;
  full_name: string;
};

type ServicePrice = {
  id: string;
  property: string;
  service_type: string;
  display_name: string;
  unit_price: number;
  unit: string;
};

type InvoiceLine = {
  item_type: string;
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
};

const itemTypes = [
  { value: "rent", label: "Tiền phòng" },
  { value: "electricity", label: "Tiền điện" },
  { value: "water", label: "Tiền nước" },
  { value: "internet", label: "Internet" },
  { value: "cleaning", label: "Vệ sinh" },
  { value: "service", label: "Dịch vụ khác" },
  { value: "adjustment", label: "Điều chỉnh" },
];

export default function NewInvoicePage() {
  const router = useRouter();
  const [properties, setProperties] = useState<Property[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [tenancies, setTenancies] = useState<Tenancy[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [prices, setPrices] = useState<ServicePrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  // Form state
  const [selectedTenancy, setSelectedTenancy] = useState<string>("");
  const [period, setPeriod] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [dueDate, setDueDate] = useState("");
  const [lines, setLines] = useState<InvoiceLine[]>([
    { item_type: "rent", description: "", quantity: 1, unit_price: 0, amount: 0 },
  ]);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    async function loadData() {
      try {
        const [propsData, roomsData, tenanciesData, usersData, pricesData] = await Promise.all([
          apiFetch<PaginatedResponse<Property>>(buildPaginatedPath(endpoints.properties, { pageSize: 200 })),
          apiFetch<PaginatedResponse<Room>>(buildPaginatedPath(endpoints.rooms, { pageSize: 200 })),
          apiFetch<PaginatedResponse<Tenancy>>(buildPaginatedPath(endpoints.tenancies, { pageSize: 200 })),
          apiFetch<PaginatedResponse<User>>(buildPaginatedPath(endpoints.users, { pageSize: 200 })),
          apiFetch<PaginatedResponse<ServicePrice>>(buildPaginatedPath(endpoints.prices, { pageSize: 200 })),
        ]);
        setProperties(propsData.results || []);
        setRooms(roomsData.results || []);
        setTenancies((tenanciesData.results || []).filter((t) => t.status === "active"));
        setUsers(usersData.results || []);
        setPrices(pricesData.results || []);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Không thể tải dữ liệu";
        setError(message);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [router]);

  // Auto-fill rent when tenancy selected
  useEffect(() => {
    if (selectedTenancy) {
      const tenancy = tenancies.find((t) => t.id === selectedTenancy);
      if (tenancy) {
        setLines((prev) => {
          const rentLine = prev.find((l) => l.item_type === "rent");
          if (rentLine) {
            return prev.map((l) =>
              l.item_type === "rent"
                ? { ...l, unit_price: Number(tenancy.base_rent), amount: Number(tenancy.base_rent) }
                : l
            );
          }
          return prev;
        });
      }
    }
  }, [selectedTenancy, tenancies]);

  const addLine = () => {
    setLines([...lines, { item_type: "service", description: "", quantity: 1, unit_price: 0, amount: 0 }]);
  };

  const removeLine = (index: number) => {
    if (lines.length > 1) {
      setLines(lines.filter((_, i) => i !== index));
    }
  };

  const updateLine = (index: number, field: keyof InvoiceLine, value: string | number) => {
    setLines(
      lines.map((line, i) => {
        if (i !== index) return line;
        const updated = { ...line, [field]: value };
        // Always recalculate amount from quantity and unit_price
        updated.amount = Number(updated.quantity) * Number(updated.unit_price);
        return updated;
      })
    );
  };

  const totalAmount = lines.reduce((sum, line) => sum + Number(line.amount), 0);

  // Helper function to parse API errors
  function parseApiError(err: unknown): { generalError: string | null; fieldErrors: Record<string, string[]> } {
    if (!(err instanceof Error)) {
      return { generalError: "Không thể tạo hóa đơn. Vui lòng thử lại.", fieldErrors: {} };
    }

    const message = err.message;
    const fieldErrors: Record<string, string[]> = {};
    let generalError: string | null = null;

    // Try to extract JSON from error message (format: "API error 400: {...}")
    const jsonMatch = message.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const errorData = JSON.parse(jsonMatch[0]);
        
        // Parse field errors
        Object.keys(errorData).forEach((key) => {
          const errorValue = errorData[key];
          
          // Handle array of objects (e.g., lines: [{invoice: [...]}, {invoice: [...]}])
          if (Array.isArray(errorValue) && errorValue.length > 0 && typeof errorValue[0] === "object") {
            errorValue.forEach((lineError: Record<string, string[]>, index: number) => {
              Object.keys(lineError).forEach((field) => {
                const fieldKey = `lines[${index}].${field}`;
                if (Array.isArray(lineError[field])) {
                  fieldErrors[fieldKey] = lineError[field];
                } else {
                  fieldErrors[fieldKey] = [String(lineError[field])];
                }
              });
            });
          }
          // Handle direct field errors (e.g., tenancy: ["This field is required."])
          else if (Array.isArray(errorValue)) {
            fieldErrors[key] = errorValue;
          } 
          // Handle string errors
          else if (typeof errorValue === "string") {
            fieldErrors[key] = [errorValue];
          } 
          // Handle nested object errors (e.g., lines[0].item_type)
          else if (typeof errorValue === "object" && errorValue !== null) {
            Object.keys(errorValue).forEach((nestedKey) => {
              const nestedValue = errorValue[nestedKey];
              if (Array.isArray(nestedValue)) {
                fieldErrors[`${key}.${nestedKey}`] = nestedValue;
              } else if (typeof nestedValue === "string") {
                fieldErrors[`${key}.${nestedKey}`] = [nestedValue];
              }
            });
          }
        });

        // Check for non_field_errors or detail
        if (errorData.non_field_errors && Array.isArray(errorData.non_field_errors)) {
          generalError = errorData.non_field_errors[0];
        } else if (errorData.detail) {
          generalError = typeof errorData.detail === "string" ? errorData.detail : errorData.detail[0];
        }
      } catch {
        // If JSON parsing fails, use message as general error
        generalError = message;
      }
    } else {
      generalError = message || "Không thể tạo hóa đơn. Vui lòng thử lại.";
    }

    return { generalError, fieldErrors };
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTenancy) {
      setError("Vui lòng chọn hợp đồng thuê");
      setFieldErrors({ tenancy: ["Vui lòng chọn hợp đồng thuê"] });
      return;
    }

    setSubmitting(true);
    setError(null);
    setFieldErrors({});

    try {
      // Calculate total from lines to ensure accuracy
      const calculatedTotal = lines.reduce((sum, line) => {
        const amount = Number(line.quantity) * Number(line.unit_price);
        return sum + amount;
      }, 0);

      // Ensure totalAmount matches calculated total
      if (Math.abs(totalAmount - calculatedTotal) > 0.01) {
        setError("Tổng tiền không khớp với chi tiết. Vui lòng kiểm tra lại.");
        setSubmitting(false);
        return;
      }

      await apiFetch(endpoints.invoices, {
        method: "POST",
        body: JSON.stringify({
          tenancy: selectedTenancy,
          period,
          due_date: dueDate || null,
          total_amount: calculatedTotal,
          amount_due: calculatedTotal,
          status: "pending",
          notes,
          lines: lines.map((l) => {
            const lineAmount = Number(l.quantity) * Number(l.unit_price);
            return {
              item_type: l.item_type,
              description: l.description,
              quantity: Number(l.quantity),
              unit_price: Number(l.unit_price),
              amount: lineAmount,
            };
          }),
        }),
      });
      router.push("/invoices");
    } catch (err: unknown) {
      const { generalError, fieldErrors: parsedFieldErrors } = parseApiError(err);
      setError(generalError);
      setFieldErrors(parsedFieldErrors);
    } finally {
      setSubmitting(false);
    }
  };

  // Get tenancy options with room and tenant info
  const tenancyOptions = tenancies.map((t) => {
    const room = rooms.find((r) => r.id === t.room);
    const property = room ? properties.find((p) => p.id === room.building) : null;
    const tenant = users.find((u) => u.id === t.tenant);
    return {
      ...t,
      room,
      property,
      tenant,
      label: `${property?.name || "N/A"} - Phòng ${room?.room_number || "N/A"} (${tenant?.full_name || "N/A"})`,
    };
  });

  if (loading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="h-8 w-48 bg-border-dark rounded animate-pulse mb-8" />
        <div className="w-full space-y-6">
          <div className="h-64 bg-white rounded-xl animate-pulse" />
          <div className="h-48 bg-white rounded-xl animate-pulse" />
        </div>
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
            Tạo hóa đơn mới
          </h1>
          <p className="text-[#475569] mt-1">Tạo hóa đơn cho khách thuê</p>
        </div>
      </motion.div>

      {error && (
        <motion.div
          className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="font-semibold mb-1">Có lỗi xảy ra:</div>
          <div>{error}</div>
        </motion.div>
      )}

      <form onSubmit={handleSubmit} className="w-full">
        <motion.div
          className="space-y-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* Basic Info */}
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-6">
            <h2 className="text-lg font-semibold text-[#0F172A] mb-4 flex items-center gap-2">
              <FileTextOutlined className="w-5 h-5 text-primary" />
              Thông tin cơ bản
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Tenancy Select */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-[#475569] mb-2">
                  Hợp đồng thuê *
                </label>
                <Select
                  className={`w-full ${fieldErrors.tenancy ? "border-red-500" : ""}`}
                  value={selectedTenancy || undefined}
                  onChange={(value) => {
                    setSelectedTenancy(value);
                    if (fieldErrors.tenancy) {
                      setFieldErrors((prev) => {
                        const next = { ...prev };
                        delete next.tenancy;
                        return next;
                      });
                    }
                  }}
                  placeholder="Chọn hợp đồng thuê"
                  required
                  status={fieldErrors.tenancy ? "error" : undefined}
                >
                  {tenancyOptions.map((t) => (
                    <Select.Option key={t.id} value={t.id}>
                      {t.label}
                    </Select.Option>
                  ))}
                </Select>
                {fieldErrors.tenancy && (
                  <div className="mt-1 text-sm text-red-500">
                    {fieldErrors.tenancy[0]}
                  </div>
                )}
              </div>

              {/* Period */}
              <div>
                <label className="block text-sm font-medium text-[#475569] mb-2">
                  Kỳ thanh toán *
                </label>
                <DatePicker
                  picker="month"
                  value={period ? dayjs(period, "YYYY-MM") : null}
                  onChange={(date) => {
                    setPeriod(date ? date.format("YYYY-MM") : "");
                    if (fieldErrors.period) {
                      setFieldErrors((prev) => {
                        const next = { ...prev };
                        delete next.period;
                        return next;
                      });
                    }
                  }}
                  className="w-full"
                  required
                  status={fieldErrors.period ? "error" : undefined}
                />
                {fieldErrors.period && (
                  <div className="mt-1 text-sm text-red-500">
                    {fieldErrors.period[0]}
                  </div>
                )}
              </div>

              {/* Due Date */}
              <div>
                <label className="block text-sm font-medium text-[#475569] mb-2">
                  Ngày đến hạn
                </label>
                <DatePicker
                  value={dueDate ? dayjs(dueDate) : null}
                  onChange={(date) => {
                    setDueDate(date ? date.format("YYYY-MM-DD") : "");
                    if (fieldErrors.due_date) {
                      setFieldErrors((prev) => {
                        const next = { ...prev };
                        delete next.due_date;
                        return next;
                      });
                    }
                  }}
                  placeholder="Chọn ngày đến hạn"
                  className="w-full"
                  status={fieldErrors.due_date ? "error" : undefined}
                />
                {fieldErrors.due_date && (
                  <div className="mt-1 text-sm text-red-500">
                    {fieldErrors.due_date[0]}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Invoice Lines */}
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-[#0F172A] flex items-center gap-2">
                <Calculator className="w-5 h-5 text-primary" />
                Chi tiết hóa đơn
              </h2>
              <button
                type="button"
                onClick={addLine}
                className="flex items-center gap-1 text-sm text-primary hover:underline"
              >
                <PlusOutlined className="w-4 h-4" />
                Thêm dòng
              </button>
            </div>

            <div className="space-y-4">
              {lines.map((line, index) => {
                const lineItemTypeError = fieldErrors[`lines[${index}].item_type`];
                const lineQuantityError = fieldErrors[`lines[${index}].quantity`];
                const lineUnitPriceError = fieldErrors[`lines[${index}].unit_price`];
                const lineAmountError = fieldErrors[`lines[${index}].amount`];
                const lineDescriptionError = fieldErrors[`lines[${index}].description`];
                
                return (
                <div key={index} className={`p-4 rounded-lg ${Object.keys(fieldErrors).some(k => k.startsWith(`lines[${index}]`)) ? "bg-red-50 border border-red-200" : "bg-white"}`}>
                  <div className="grid grid-cols-12 gap-3">
                    {/* Item Type */}
                    <div className="col-span-12 md:col-span-3">
                      <label className="block text-xs text-[#475569] mb-1">Loại *</label>
                      <Select
                        value={line.item_type}
                        onChange={(value) => {
                          updateLine(index, "item_type", value);
                          if (lineItemTypeError) {
                            setFieldErrors((prev) => {
                              const next = { ...prev };
                              delete next[`lines[${index}].item_type`];
                              return next;
                            });
                          }
                        }}
                        className="w-full"
                        status={lineItemTypeError ? "error" : undefined}
                      >
                        {itemTypes.map((type) => (
                          <Select.Option key={type.value} value={type.value}>
                            {type.label}
                          </Select.Option>
                        ))}
                      </Select>
                      {lineItemTypeError && (
                        <div className="mt-1 text-xs text-red-500">
                          {lineItemTypeError[0]}
                        </div>
                      )}
                    </div>

                    {/* Description */}
                    <div className="col-span-12 md:col-span-3">
                      <label className="block text-xs text-[#475569] mb-1">Mô tả</label>
                      <Input
                        value={line.description}
                        onChange={(e) => {
                          updateLine(index, "description", e.target.value);
                          if (lineDescriptionError) {
                            setFieldErrors((prev) => {
                              const next = { ...prev };
                              delete next[`lines[${index}].description`];
                              return next;
                            });
                          }
                        }}
                        placeholder="Ghi chú..."
                        status={lineDescriptionError ? "error" : undefined}
                      />
                      {lineDescriptionError && (
                        <div className="mt-1 text-xs text-red-500">
                          {lineDescriptionError[0]}
                        </div>
                      )}
                    </div>

                    {/* Quantity */}
                    <div className="col-span-4 md:col-span-2">
                      <label className="block text-xs text-[#475569] mb-1">Số lượng *</label>
                      <InputNumber
                        value={line.quantity}
                        onChange={(value) => {
                          updateLine(index, "quantity", value || 0);
                          if (lineQuantityError) {
                            setFieldErrors((prev) => {
                              const next = { ...prev };
                              delete next[`lines[${index}].quantity`];
                              return next;
                            });
                          }
                        }}
                        min={0}
                        step={0.01}
                        style={{ width: '100%' }}
                        status={lineQuantityError ? "error" : undefined}
                      />
                      {lineQuantityError && (
                        <div className="mt-1 text-xs text-red-500">
                          {lineQuantityError[0]}
                        </div>
                      )}
                    </div>

                    {/* Unit Price */}
                    <div className="col-span-4 md:col-span-2">
                      <label className="block text-xs text-[#475569] mb-1">Đơn giá *</label>
                      <InputNumber
                        value={line.unit_price}
                        onChange={(value) => {
                          updateLine(index, "unit_price", value || 0);
                          if (lineUnitPriceError) {
                            setFieldErrors((prev) => {
                              const next = { ...prev };
                              delete next[`lines[${index}].unit_price`];
                              return next;
                            });
                          }
                        }}
                        min={0}
                        style={{ width: '100%' }}
                        status={lineUnitPriceError ? "error" : undefined}
                      />
                      {lineUnitPriceError && (
                        <div className="mt-1 text-xs text-red-500">
                          {lineUnitPriceError[0]}
                        </div>
                      )}
                    </div>

                    {/* Amount */}
                    <div className="col-span-4 md:col-span-2 flex items-end gap-2">
                      <div className="flex-1">
                        <label className="block text-xs text-[#475569] mb-1">Thành tiền</label>
                        <div >
                          {Number(line.amount).toLocaleString("vi-VN")}đ
                        </div>
                      </div>
                      {lines.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeLine(index)}
                          className="h-10 w-10 flex items-center justify-center text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                        >
                          <DeleteOutlined className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  {lineAmountError && (
                    <div className="mt-2 text-xs text-red-500">
                      {lineAmountError[0]}
                    </div>
                  )}
                </div>
              );
              })}
            </div>

            {/* Total */}
            <div className="mt-4 pt-4 border-t border-[#E2E8F0] flex items-center justify-between">
              <span >Tổng cộng</span>
              <span className="text-2xl font-bold text-primary">
                {totalAmount.toLocaleString("vi-VN")}đ
              </span>
            </div>
          </div>

          {/* Notes */}
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-6">
            <label className="block text-sm font-medium text-[#475569] mb-2">Ghi chú</label>
            <Input.TextArea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Ghi chú thêm cho hóa đơn..."
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3">
            <Link
              href="/invoices" >
              Hủy
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 px-6 py-2.5 bg-primary text-bg-dark font-semibold rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <LoadingOutlined className="w-4 h-4 animate-spin" />
                  Đang tạo...
                </>
              ) : (
                "Tạo hóa đơn"
              )}
            </button>
          </div>
        </motion.div>
      </form>
    </div>
  );
}
