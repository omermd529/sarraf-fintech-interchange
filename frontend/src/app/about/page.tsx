import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Zap, Globe, User, Mail, Linkedin, Github, Landmark, Scale, DollarSign } from "lucide-react";

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
              <Linkedin className="w-4 h-4" /> linkedin.com/in/mdomer529
            </a>
            <a href="https://github.com/omermd529" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-zinc-400 hover:text-emerald-500 transition-colors">
              <Github className="w-4 h-4" /> github.com/omermd529
            </a>
          </div>
        </section>

      </div>
    </div>
  );
}
