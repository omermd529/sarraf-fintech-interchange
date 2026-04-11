"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, CheckCircle2, AlertCircle, ArrowLeft } from "lucide-react";
import BigNumber from "bignumber.js";
import { formatSAR } from "@/lib/currency";
import Link from "next/link";

const API_BASE = process.env.NEXT_PUBLIC_API_URL;
const USER_ID = process.env.NEXT_PUBLIC_USER_ID;

export default function PayPage() {
  const [merchants, setMerchants] = useState([]);
  const [balance, setBalance] = useState("0.00");
  const [amount, setAmount] = useState("");
  const [selectedMerchant, setSelectedMerchant] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ status: string; rrn: string } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      fetch(`${API_BASE}/merchants`).then(r => r.json()),
      fetch(`${API_BASE}/balance?user_id=${USER_ID}`).then(r => r.json()),
    ]).then(([merData, balData]) => {
      setMerchants(merData || []);
      setBalance(balData.balance_sar);
    }).catch(() => setError("Failed to load data"));
  }, []);

  const fee = amount ? new BigNumber(amount).times(0.01).toFixed(2) : "0.00";
  const total = amount ? new BigNumber(amount).plus(fee).toFixed(2) : "0.00";

  const handlePay = async () => {
    if (!amount || !selectedMerchant) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch(`${API_BASE}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: USER_ID, merchant_id: selectedMerchant, amount }),
      });
      if (res.ok) {
        const data = await res.json();
        setResult(data);
        setAmount("");
        // Refresh balance
        const balRes = await fetch(`${API_BASE}/balance?user_id=${USER_ID}`);
        const balData = await balRes.json();
        setBalance(balData.balance_sar);
      } else {
        const errData = await res.json();
        setError(errData.error || "Payment failed");
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-8">
      <div className="max-w-2xl mx-auto">
        <Link href="/" className="flex items-center gap-2 text-zinc-500 hover:text-zinc-300 text-sm mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-semibold text-zinc-100">Send Payment</CardTitle>
            <Send className="w-5 h-5 text-emerald-500" />
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Balance */}
            <div className="text-sm text-zinc-500">
              Available Balance: <span className="text-zinc-100 font-semibold">{formatSAR(balance)}</span>
            </div>

            {/* Merchant */}
            <div className="space-y-2">
              <label className="text-sm text-zinc-400">Merchant</label>
              <Select onValueChange={setSelectedMerchant}>
                <SelectTrigger className="bg-zinc-950 border-zinc-800">
                  <SelectValue placeholder="Select Merchant" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  {merchants.map((m: any) => (
                    <SelectItem key={m.merchant_id} value={m.merchant_id}>{m.business_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <label className="text-sm text-zinc-400">Amount (SAR)</label>
              <Input
                placeholder="0.00"
                type="number"
                className="bg-zinc-950 border-zinc-800 text-lg"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>

            {/* Fee Breakdown */}
            {amount && parseFloat(amount) > 0 && (
              <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 space-y-2 text-sm">
                <div className="flex justify-between text-zinc-400">
                  <span>Amount</span>
                  <span>{formatSAR(amount)}</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Interchange Fee (1%)</span>
                  <span>{formatSAR(fee)}</span>
                </div>
                <div className="border-t border-zinc-800 pt-2 flex justify-between font-semibold text-zinc-100">
                  <span>Total Deduction</span>
                  <span>{formatSAR(total)}</span>
                </div>
              </div>
            )}

            {/* Submit */}
            <Button
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-6 text-base"
              onClick={handlePay}
              disabled={loading || !amount || !selectedMerchant}
            >
              {loading ? "Processing..." : `Pay ${formatSAR(amount || "0")}`}
            </Button>

            {/* Result */}
            {result && (
              <div className="flex items-center gap-3 bg-emerald-950/50 border border-emerald-800 rounded-lg p-4">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                <div>
                  <p className="text-sm font-semibold text-emerald-400">Payment Successful</p>
                  <p className="text-xs text-zinc-400">RRN: <span className="font-mono">{result.rrn}</span></p>
                </div>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-3 bg-red-950/50 border border-red-800 rounded-lg p-4">
                <AlertCircle className="w-5 h-5 text-red-500" />
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
