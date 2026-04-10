"use client";

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Wallet, Send, History, CheckCircle2 } from "lucide-react";
import BigNumber from 'bignumber.js';

const API_BASE = process.env.NEXT_PUBLIC_API_URL;
const USER_ID = process.env.NEXT_PUBLIC_USER_ID;

export default function SarrafDashboard() {
  const [balance, setBalance] = useState("0.00");
  const [merchants, setMerchants] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [amount, setAmount] = useState("");
  const [selectedMerchant, setSelectedMerchant] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    try {
      const [balRes, merRes, txRes] = await Promise.all([
        fetch(`${API_BASE}/balance?user_id=${USER_ID}`),
        fetch(`${API_BASE}/merchants`),
        fetch(`${API_BASE}/transactions?user_id=${USER_ID}`)
      ]);

      const balData = await balRes.json();
      const merData = await merRes.json();
      const txData = await txRes.json();

      setBalance(balData.balance_sar);
      setMerchants(merData);
      setTransactions(txData || []);
    } catch (err) {
      console.error("Failed to fetch data", err);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handlePay = async () => {
    if (!amount || !selectedMerchant) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: USER_ID,
          merchant_id: selectedMerchant,
          amount: amount
        })
      });
      if (res.ok) {
        setAmount("");
        fetchData();
      }
    } catch (err) {
      alert("Payment failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-8">
      {/* Header */}
      <div className="max-w-6xl mx-auto flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-emerald-500">SARRAF INTERCHANGE</h1>
          <p className="text-zinc-500 text-sm">Fintech Infrastructure • Dev Environment</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 bg-zinc-900 border border-zinc-800 rounded-full">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          <span className="text-xs font-medium uppercase">System Active</span>
        </div>
      </div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* Balance Card */}
        <Card className="bg-zinc-900 border-zinc-800 col-span-1">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Current Balance</CardTitle>
            <Wallet className="w-4 h-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tighter">
              SAR {new BigNumber(balance).toFormat(2)}
            </div>
          </CardContent>
        </Card>

        {/* Payment Form */}
        <Card className="bg-zinc-900 border-zinc-800 col-span-1 md:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Quick Payment</CardTitle>
            <Send className="w-4 h-4 text-emerald-500" />
          </CardHeader>
          <CardContent className="flex gap-4">
            <Select onValueChange={setSelectedMerchant}>
              <SelectTrigger className="w-[240px] bg-zinc-950 border-zinc-800">
                <SelectValue placeholder="Select Merchant" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800">
                {merchants.map((m: any) => (
                  <SelectItem key={m.merchant_id} value={m.merchant_id}>{m.business_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder="Amount (SAR)"
              type="number"
              className="bg-zinc-950 border-zinc-800"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <Button
              className="bg-emerald-600 hover:bg-emerald-500 text-white"
              onClick={handlePay}
              disabled={loading}
            >
              {loading ? "Processing..." : "Pay"}
            </Button>
          </CardContent>
        </Card>

        {/* Transaction History */}
        <Card className="bg-zinc-900 border-zinc-800 col-span-1 md:col-span-3">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Recent Transactions</CardTitle>
            <History className="w-4 h-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader className="border-zinc-800">
                <TableRow>
                  <TableHead className="text-zinc-500">RRN</TableHead>
                  <TableHead className="text-zinc-500">Amount</TableHead>
                  <TableHead className="text-zinc-500">Fee</TableHead>
                  <TableHead className="text-zinc-500">Status</TableHead>
                  <TableHead className="text-zinc-500 text-right">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx: any) => (
                  <TableRow key={tx.rrn} className="border-zinc-800 hover:bg-zinc-800/50">
                    <TableCell className="font-mono text-xs">{tx.rrn}</TableCell>
                    <TableCell className="font-semibold">SAR {tx.amount}</TableCell>
                    <TableCell className="text-zinc-500">SAR {tx.fee}</TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1 text-xs text-emerald-500">
                        <CheckCircle2 className="w-3 h-3" /> {tx.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-zinc-500 text-xs">
                      {new Date(tx.created_at).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
