import Shell from "@/components/Shell";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";

export default function HuntsPage() {
  return (
    <Shell>
      <Sidebar/>
      <div className="flex-1 flex flex-col">
        <Topbar/>
        <main className="p-6 space-y-6">
          <h1 className="text-xl font-semibold">Threat Hunts</h1>
          <div className="border border-[var(--soc-panel-border)] rounded-lg p-4 bg-[#020617]/80">
            Enterprise-grade hunt console coming online…
          </div>
        </main>
      </div>
    </Shell>
  );
}
