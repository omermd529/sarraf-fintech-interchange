"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Wallet, Activity, CheckCircle2, Send, History } from "lucide-react";
import { formatSAR } from "@/lib/currency";
import Link from "next/link";

const API_BASE = process.env.NEXT_PUBLIC_API_URL;
const USER_ID = process.env.NEXT_PUBLIC_USER_ID;

export default function Dashboard() {
  const [balance, setBalance] = useState("0.00");
  const [fullName, setFullName] = useState("");
  const [transactions, setTransactions] = useState([]);
  const [healthy, setHealthy] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(`${API_BASE}/balance?user_id=${USER_ID}`).then(r => r.json()),
      fetch(`${API_BASE}/transactions?user_id=${USER_ID}`).then(r => r.json()),
      fetch(`${API_BASE}/health`).then(r => r.ok),
    ]).then(([balData, txData, isHealthy]) => {
      setBalance(balData.balance_sar);
      setFullName(balData.full_name);
      setTransactions((txData || []).slice(0, 5));
      setHealthy(isHealthy);
    }).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-8">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Welcome + System Health */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Welcome back, {fullName || "User"}</h2>
            <p className="text-zinc-500 text-sm">Sarraf Interchange • Dev Environment</p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 bg-zinc-900 border border-zinc-800 rounded-full">
            <div className={`w-2 h-2 rounded-full ${healthy ? "bg-emerald-500 animate-pulse" : "bg-red-500"}`} />
            <span className="text-xs font-medium uppercase">{healthy ? "System Active" : "System Down"}</span>
          </div>
        </div>

        {/* Top Row: Balance + Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-zinc-900 border-zinc-800 col-span-1">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-zinc-400">Current Balance</CardTitle>
              <Wallet className="w-4 h-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold tracking-tighter">
                {formatSAR(balance)}
              </div>
              <p className="text-xs text-zinc-500 mt-1">Saudi Riyal</p>
            </CardContent>
          </Card>

          <Link href="/pay" className="col-span-1">
            <Card className="bg-zinc-900 border-zinc-800 h-full hover:border-emerald-800 transition-colors cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-zinc-400">Quick Action</CardTitle>
                <Send className="w-4 h-4 text-emerald-500" />
              </CardHeader>
              <CardContent>
                <p className="text-lg font-semibold">Send Payment</p>
                <p className="text-xs text-zinc-500 mt-1">Pay a merchant instantly</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/history" className="col-span-1">
            <Card className="bg-zinc-900 border-zinc-800 h-full hover:border-emerald-800 transition-colors cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-zinc-400">Audit Trail</CardTitle>
                <History className="w-4 h-4 text-emerald-500" />
              </CardHeader>
              <CardContent>
                <p className="text-lg font-semibold">Transaction History</p>
                <p className="text-xs text-zinc-500 mt-1">View all ledger entries</p>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Recent Activity */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Recent Activity</CardTitle>
            <Activity className="w-4 h-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            {transactions.length === 0 ? (
              <p className="text-zinc-500 text-sm py-4 text-center">No transactions yet.</p>
            ) : (
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
                      <TableCell className="font-semibold">{formatSAR(tx.amount)}</TableCell>
                      <TableCell className="text-zinc-400">{formatSAR(tx.fee)}</TableCell>
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
            )}
            {transactions.length > 0 && (
              <Link href="/history" className="block text-center text-xs text-emerald-500 hover:text-emerald-400 mt-4">
                View all transactions →
              </Link>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
