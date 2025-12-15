"use client";

import { useEffect, useState } from "react";
import { apiFetch, endpoints, clearAuthToken } from "@/lib/api";
import { useRouter, useParams } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowLeftOutlined, CalendarOutlined, DeleteOutlined, FileTextOutlined, LoadingOutlined, PlusOutlined } from '@ant-design/icons'
import { Calculator,  } from 'lucide-react';
import { Input, Select, DatePicker } from "antd";
import dayjs, { type Dayjs } from "dayjs";

type InvoiceLine = {
  id?: string;
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
  notes: string;
  lines: InvoiceLine[];
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

export default function EditInvoicePage() {
  const router = useRouter();
  const params = useParams();
  const invoiceId = params.id as string;
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invoice, setInvoice] = useState<Invoice | null>(null);

  // Form state
  const [dueDate, setDueDate] = useState("");
  const [lines, setLines] = useState<InvoiceLine[]>([
    { item_type: "rent", description: "", quantity: 1, unit_price: 0, amount: 0 },
  ]);
  const [notes, setNotes] = useState("");

  // Load invoice data
  useEffect(() => {
    async function loadInvoice() {
      try {
        setLoading(true);
        const invoiceData = await apiFetch<Invoice>(`${endpoints.invoices}${invoiceId}/`);
        setInvoice(invoiceData);
        setDueDate(invoiceData.due_date ? invoiceData.due_date.split("T")[0] : "");
        setLines(
          invoiceData.lines && invoiceData.lines.length > 0
            ? invoiceData.lines.map((line) => ({
                ...line,
                quantity: Number(line.quantity),
                unit_price: Number(line.unit_price),
                amount: Number(line.amount),
              }))
            : [{ item_type: "rent", description: "", quantity: 1, unit_price: 0, amount: 0 }]
        );
        setNotes(invoiceData.notes || "");
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Không thể tải dữ liệu hóa đơn";
        setError(message);
      } finally {
        setLoading(false);
      }
    }
    loadInvoice();
  }, [invoiceId, router]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoice) return;

    setSubmitting(true);
    setError(null);

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

      // Calculate amount_due: new total - (old total - old amount_due)
      // This preserves the amount already paid
      const oldTotalPaid = invoice.total_amount - invoice.amount_due;
      const newAmountDue = Math.max(0, calculatedTotal - oldTotalPaid);

      await apiFetch(`${endpoints.invoices}${invoiceId}/`, {
        method: "PATCH",
        body: JSON.stringify({
          due_date: dueDate || null,
          total_amount: calculatedTotal,
          amount_due: newAmountDue,
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
      router.push(`/invoices/${invoiceId}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Không thể cập nhật hóa đơn";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

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

  if (error && !invoice) {
    return (
      <div className="p-6 lg:p-8">
        <div className="text-center py-12">
          <p className="text-red-400 text-lg">{error}</p>
          <Link href="/invoices" className="text-primary hover:underline mt-4 inline-block">
            Quay lại danh sách
          </Link>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return null;
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
            Chỉnh sửa hóa đơn
          </h1>
          <p className="text-[#475569] mt-1">Kỳ: {invoice.period}</p>
        </div>
      </motion.div>

      {error && (
        <motion.div
          className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400"
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
          {/* Basic Info */}
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-6">
            <h2 className="text-lg font-semibold text-[#0F172A] mb-4 flex items-center gap-2">
              <FileTextOutlined className="w-5 h-5 text-primary" />
              Thông tin cơ bản
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Period - Read only */}
              <div>
                <label className="block text-sm font-medium text-[#475569] mb-2">
                  Kỳ thanh toán
                </label>
                <Input
                  type="text"
                  value={invoice.period}
                  disabled
                  className="bg-[#F8FAFC] cursor-not-allowed"
                />
              </div>

              {/* Due Date */}
              <div>
                <label className="block text-sm font-medium text-[#475569] mb-2">
                  Ngày đến hạn
                </label>
                <DatePicker
                  value={dueDate ? dayjs(dueDate) : null}
                  onChange={(date) => setDueDate(date ? date.format("YYYY-MM-DD") : "")}
                  placeholder="Chọn ngày đến hạn"
                  className="w-full"
                />
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
              {lines.map((line, index) => (
                <div key={index} className="p-4 bg-white rounded-lg">
                  <div className="grid grid-cols-12 gap-3">
                    {/* Item Type */}
                    <div className="col-span-12 md:col-span-3">
                      <label className="block text-xs text-[#475569] mb-1">Loại</label>
                      <Select
                        value={line.item_type}
                        onChange={(value) => updateLine(index, "item_type", value)}
                      >
                        
                        
                          {itemTypes.map((type) => (
                            <Select.Option key={type.value} value={type.value}>
                              {type.label}
                            </Select.Option>
                          ))}
                        
                      </Select>
                    </div>

                    {/* Description */}
                    <div className="col-span-12 md:col-span-3">
                      <label className="block text-xs text-[#475569] mb-1">Mô tả</label>
                      <Input
                        type="text"
                        value={line.description}
                        onChange={(e) => updateLine(index, "description", e.target.value)}
                        placeholder="Ghi chú..."
                      />
                    </div>

                    {/* Quantity */}
                    <div className="col-span-4 md:col-span-2">
                      <label className="block text-xs text-[#475569] mb-1">Số lượng</label>
                      <Input
                        type="number"
                        value={line.quantity}
                        onChange={(e) => updateLine(index, "quantity", Number(e.target.value))}
                        min="0"
                        step="0.01"
                      />
                    </div>

                    {/* Unit Price */}
                    <div className="col-span-4 md:col-span-2">
                      <label className="block text-xs text-[#475569] mb-1">Đơn giá</label>
                      <Input
                        type="number"
                        value={line.unit_price}
                        onChange={(e) => updateLine(index, "unit_price", Number(e.target.value))}
                        min="0"
                      />
                    </div>

                    {/* Amount */}
                    <div className="col-span-4 md:col-span-2 flex items-end gap-2">
                      <div className="flex-1">
                        <label className="block text-xs text-[#475569] mb-1">Thành tiền</label>
                        <div className="h-10 flex items-center text-[#0F172A] font-medium">
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
                </div>
              ))}
            </div>

            {/* Total */}
            <div className="mt-4 pt-4 border-t border-[#E2E8F0] flex items-center justify-between">
              <span className="text-lg font-semibold text-[#0F172A]">Tổng cộng</span>
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
              href={`/invoices/${invoiceId}`}
              className="px-6 py-2.5 text-[#475569] font-medium rounded-lg hover:bg-gray-100 transition-colors"
            >
              Hủy
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white font-semibold rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <LoadingOutlined className="w-4 h-4 animate-spin" />
                  Đang cập nhật...
                </>
              ) : (
                "Cập nhật hóa đơn"
              )}
            </button>
          </div>
        </motion.div>
      </form>
    </div>
  );
}

