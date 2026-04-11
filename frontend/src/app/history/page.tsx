"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { History, CheckCircle2, ArrowLeft } from "lucide-react";
import { formatSAR } from "@/lib/currency";
import Link from "next/link";

const API_BASE = process.env.NEXT_PUBLIC_API_URL;
const USER_ID = process.env.NEXT_PUBLIC_USER_ID;

export default function HistoryPage() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/transactions?user_id=${USER_ID}`)
      .then(r => r.json())
      .then(data => setTransactions(data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-8">
      <div className="max-w-4xl mx-auto">
        <Link href="/" className="flex items-center gap-2 text-zinc-500 hover:text-zinc-300 text-sm mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-semibold text-zinc-100">Transaction History</CardTitle>
            <History className="w-5 h-5 text-emerald-500" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-zinc-500 text-sm py-8 text-center">Loading transactions...</p>
            ) : transactions.length === 0 ? (
              <p className="text-zinc-500 text-sm py-8 text-center">No transactions yet.</p>
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
