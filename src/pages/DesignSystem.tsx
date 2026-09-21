import React, { useState } from 'react';
import { Inbox } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Field from '@/components/admin/Field';
import EmptyState from '@/components/admin/EmptyState';

/**
 * Dev-only showcase of every primitive, in every variant/state, on one page
 * — the Prompt 4 gate from the redesign plan: catch mismatches here, where
 * fixing one is a single edit, instead of after they've been copy-pasted
 * across a dozen pages in Prompt 7. Not registered in production builds
 * (see the `import.meta.env.DEV` guard in App.tsx).
 */
const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="space-y-4">
    <h2 className="label">{title}</h2>
    <div className="space-y-4">{children}</div>
  </section>
);

const Swatch: React.FC<{ name: string; varName: string }> = ({ name, varName }) => (
  <div className="flex items-center gap-3">
    <div className="h-8 w-8 rounded-md border border-border" style={{ background: `hsl(var(${varName}))` }} />
    <div className="text-body-sm">
      <div className="text-foreground">{name}</div>
      <div className="text-muted-foreground">{varName}</div>
    </div>
  </div>
);

const DesignSystem: React.FC = () => {
  const [loading, setLoading] = useState(false);

  return (
    <div className="admin-panel min-h-screen space-y-12 p-8">
      <div>
        <h1 className="text-display text-foreground">Design System</h1>
        <p className="text-body text-muted-foreground">
          Every primitive, every variant, every state. Dev-only — not part of the shipped app.
        </p>
      </div>

      <Section title="Type scale">
        <p className="text-display text-foreground">Display · 24/32 · -0.02em · 700</p>
        <h1 className="text-h1 text-foreground">Heading 1 · 20/28 · -0.015em · 700</h1>
        <h2 className="text-h2 text-foreground">Heading 2 · 16/24 · -0.01em · 600</h2>
        <h3 className="text-h3 text-foreground">Heading 3 · 14/20 · 0em · 600</h3>
        <p className="text-body text-foreground">Body · 14/20 · 0em · 400 — default running text.</p>
        <p className="text-body-sm text-muted-foreground">Body small · 12/16 · 0em · 400 — secondary/meta text.</p>
        <p className="label">Caption / label · 11/14 · +0.04em · 500 · uppercase</p>
        <p className="text-body text-foreground">
          Tabular numerals: <span className="tabular">1,204,398</span> vs proportional:{' '}
          <span>1,204,398</span>
        </p>
      </Section>

      <Section title="Colors — one accent, semantic states only">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Swatch name="Background" varName="--background" />
          <Swatch name="Surface (card)" varName="--card" />
          <Swatch name="Surface raised (popover)" varName="--popover" />
          <Swatch name="Border" varName="--border" />
          <Swatch name="Border strong" varName="--border-strong" />
          <Swatch name="Accent" varName="--accent" />
          <Swatch name="Accent hover" varName="--accent-hover" />
          <Swatch name="Accent subtle" varName="--accent-subtle" />
          <Swatch name="Success" varName="--success" />
          <Swatch name="Warning" varName="--warning" />
          <Swatch name="Danger" varName="--danger" />
          <Swatch name="Info" varName="--info" />
        </div>
      </Section>

      <Section title="Button — variants × sizes × states">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Danger</Button>
          <Button variant="outline">Outline</Button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary" size="sm">Small</Button>
          <Button variant="primary" size="default">Default</Button>
          <Button variant="primary" size="lg">Large</Button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary" disabled>Disabled</Button>
          <Button variant="primary" loading={loading} onClick={() => setLoading((v) => !v)}>
            {loading ? 'Loading…' : 'Click to toggle loading'}
          </Button>
        </div>
      </Section>

      <Section title="Badge — semantic states only">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="neutral">Neutral</Badge>
          <Badge variant="success">Success</Badge>
          <Badge variant="warning">Warning</Badge>
          <Badge variant="danger">Danger</Badge>
          <Badge variant="info">Info</Badge>
        </div>
      </Section>

      <Section title="Card — default and interactive">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Static card</CardTitle>
            </CardHeader>
            <CardContent className="text-body-sm text-muted-foreground">
              No hover treatment — used for static content.
            </CardContent>
          </Card>
          {/* `interactive` only supplies hover/cursor styling — it does not add
              keyboard/focus/role handling, since Card is a plain div used both
              wrapped in a real focusable element (Link, as in AdminDashboard.tsx)
              and standalone. When there's no wrapping Link, wrap it in a real
              <button> like this instead of putting onClick directly on the div —
              a bare div+onClick is not keyboard-operable. */}
          <button type="button" className="text-left w-full" onClick={() => {}}>
            <Card interactive>
              <CardHeader>
                <CardTitle>Interactive card</CardTitle>
              </CardHeader>
              <CardContent className="text-body-sm text-muted-foreground">
                Hover: border lightens, surface lifts slightly. No colored glow.
              </CardContent>
            </Card>
          </button>
        </div>
      </Section>

      <Section title="Field — label + control + helper/error">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Project title" hint="Shown on the public site." required>
            {(bind) => <Input {...bind} placeholder="e.g. Portfolio Admin" />}
          </Field>
          <Field label="Description" error="This field is required.">
            {(bind) => <Textarea {...bind} placeholder="Short description" />}
          </Field>
        </div>
      </Section>

      <Section title="Table">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead className="text-right">Count</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[
              ['Projects', 12],
              ['Blog posts', 98],
              ['Messages', 4],
            ].map(([name, count]) => (
              <TableRow key={name as string}>
                <TableCell>{name}</TableCell>
                <TableCell className="tabular text-right">{count}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Section>

      <Section title="Empty state">
        <EmptyState
          icon={Inbox}
          title="No messages yet"
          description="Messages sent through the contact form will show up here."
          action={{ label: 'Refresh', onClick: () => {} }}
        />
      </Section>

      <Section title="Skeleton">
        <div className="space-y-2">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-24 w-full" />
        </div>
      </Section>
    </div>
  );
};

export default DesignSystem;
