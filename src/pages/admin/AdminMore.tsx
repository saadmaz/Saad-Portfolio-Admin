import { Link, useNavigate } from 'react-router-dom';
import { ChevronRight, ExternalLink, History, LogOut } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { navGroups, SITE_HOST, SITE_URL } from '@/components/admin/navConfig';
import { useAdminOverview } from '@/components/admin/useAdminOverview';
import { useAuth } from '@/shared/contexts/AuthContext';

const rowClass =
  'flex items-center gap-3.5 px-4 py-3.5 text-[15px] text-foreground transition-colors active:bg-secondary hover:bg-secondary/50';

const Row = ({ icon: Icon, label, count }: { icon: LucideIcon; label: string; count?: number }) => (
  <>
    <Icon className="h-[18px] w-[18px] text-fg-2" aria-hidden="true" />
    <span className="flex-1">{label}</span>
    {count !== undefined && <span className="font-mono text-[13px] text-muted-foreground">{count}</span>}
    <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
  </>
);

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="space-y-2.5">
    <h2 className="label">{title}</h2>
    <div className="divide-y divide-border-subtle overflow-hidden rounded-xl border border-border-subtle bg-card">
      {children}
    </div>
  </section>
);

/** Mobile "More" tab: every collection that isn't in the tab bar, plus account actions. */
const AdminMore = () => {
  const { data } = useAdminOverview();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const counts = data?.counts ?? {};

  const groups = navGroups.filter((g) => g.label !== 'Overview');

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <Section key={group.label} title={group.label}>
          {group.items.map((item) => (
            <Link key={item.path} to={item.path} className={rowClass}>
              <Row icon={item.icon} label={item.label} count={item.countKey ? counts[item.countKey] : undefined} />
            </Link>
          ))}
        </Section>
      ))}

      <Section title="Account">
        <Link to="/logs" className={rowClass}>
          <Row icon={History} label="Activity log" />
        </Link>
        <a href={SITE_URL} target="_blank" rel="noopener noreferrer" className={rowClass}>
          <Row icon={ExternalLink} label={`View ${SITE_HOST}`} />
        </a>
        <button
          type="button"
          onClick={async () => { await logout(); navigate('/login'); }}
          className={`${rowClass} w-full text-left`}
        >
          <Row icon={LogOut} label="Sign out" />
        </button>
      </Section>
    </div>
  );
};

export default AdminMore;
