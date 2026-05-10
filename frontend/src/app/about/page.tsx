import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Zap, Globe, User, Mail, Landmark, Scale, DollarSign } from "lucide-react";

export default function About() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-8">
      <div className="max-w-4xl mx-auto space-y-10">

        {/* The Sarraf Vision */}
        <section>
          <h1 className="text-3xl font-bold tracking-tight mb-3">The Sarraf Vision</h1>
          <p className="text-zinc-400 leading-relaxed">
            Sarraf is a high-performance financial interchange platform engineered for the modern Saudi economy.
            In line with the goals of Saudi Vision 2030, Sarraf provides the secure, ACID-compliant digital
            &quot;plumbing&quot; necessary for a cashless society. Every transaction is processed with mathematical
            precision, ensuring that the 1% interchange fee and the treasury ledger are tracked down to the last halala.
          </p>
        </section>

        {/* Strategic Infrastructure */}
        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-3 flex items-center gap-2">
            <Globe className="w-5 h-5 text-emerald-500" /> Strategic Infrastructure &amp; The Saudi Market
          </h2>
          <p className="text-zinc-400 leading-relaxed">
            While Sarraf is designed from the ground up for the Saudi Arabian market, its infrastructure is
            strategically deployed in the Google Cloud (GCP) Doha region (me-central1). This choice was made to
            ensure the lowest possible latency for users across the GCC while navigating current regional cloud
            provisioning constraints. By positioning our cluster in Doha, we achieve sub-30ms response times for
            the Dammam and Riyadh corridors, ensuring a &quot;local-feel&quot; performance for the Sarraf dashboard.
          </p>
        </section>

        {/* SAMA & PDPL */}
        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-3 flex items-center gap-2">
            <Scale className="w-5 h-5 text-emerald-500" /> Built for SAMA &amp; PDPL Standards
          </h2>
          <p className="text-zinc-400 mb-4">
            In the world of Saudi Fintech, trust is built on compliance. Sarraf is architected with two critical regulatory frameworks in mind:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader className="flex flex-row items-center gap-2 pb-2">
                <Landmark className="w-4 h-4 text-emerald-500" />
                <CardTitle className="text-sm font-medium text-zinc-300">SAMA Compliance</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-zinc-500">
                  Our backend utilizes strict ACID-compliant transaction logic and immutable audit trails
                  (RRN tracking), mirroring the rigorous data integrity and financial reporting standards required by SAMA.
                </p>
              </CardContent>
            </Card>
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader className="flex flex-row items-center gap-2 pb-2">
                <Shield className="w-4 h-4 text-emerald-500" />
                <CardTitle className="text-sm font-medium text-zinc-300">PDPL (Data Protection)</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-zinc-500">
                  Data privacy is non-negotiable. Sarraf implements Zero-Trust security—utilizing Workload Identity
                  to eliminate hardcoded credentials and ensuring all PII is handled according to the KSA&apos;s Personal Data Protection Law.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* FinOps & Architecture */}
        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-3 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-emerald-500" /> FinOps &amp; Architecture
          </h2>
          <p className="text-zinc-400 mb-4">
            Sarraf utilizes a FinOps-first architecture designed to balance performance with fiscal responsibility.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-zinc-300">Multi-Project Isolation</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-zinc-500">Clean separation of environments to prevent blast radius and ensure security.</p>
              </CardContent>
            </Card>
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-zinc-300">Spot Orchestration</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-zinc-500">Intelligent use of GCP Spot instances to reduce operational overhead without sacrificing availability.</p>
              </CardContent>
            </Card>
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-zinc-300">Infracost Budgeting</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-zinc-500">Integrated cost-estimation for every infrastructure change via Terraform.</p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* The Engineer */}
        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-2 flex items-center gap-2">
            <User className="w-5 h-5 text-emerald-500" /> The Engineer
          </h2>
          <h3 className="text-lg font-semibold text-zinc-200">Omer Mohammad</h3>
          <p className="text-sm text-zinc-500 mb-3">Cloud &amp; Platform Engineer</p>
          <p className="text-zinc-400 leading-relaxed mb-4">
            Omer is a DevOps specialist with over 4 years of experience building mission-critical systems
            for global fintech leaders. He specializes in bridging the gap between raw code and production-grade
            infrastructure, with a deep focus on the Middle Eastern market.
          </p>
          <div className="flex flex-wrap gap-4">
            <a href="mailto:omermd529@gmail.com" className="flex items-center gap-2 text-sm text-zinc-400 hover:text-emerald-500 transition-colors">
              <Mail className="w-4 h-4" /> omermd529@gmail.com
            </a>
            <a href="https://www.linkedin.com/in/mdomer529" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-zinc-400 hover:text-emerald-500 transition-colors">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg> linkedin.com/in/mdomer529
            </a>
            <a href="https://github.com/omermd529" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-zinc-400 hover:text-emerald-500 transition-colors">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/></svg> github.com/omermd529
            </a>
          </div>
        </section>

      </div>
    </div>
  );
}
