import type { ReactNode } from "react";
import type { AdminRole } from "../admin.types";
import { AdminHeader, type AdminSection } from "./AdminHeader";

type Props = {
  section: AdminSection;
  eyebrow: string;
  title: string;
  description: string;
  onLogout: () => void;
  onNavigate: (section: AdminSection) => void;
  children: ReactNode;
  actions?: ReactNode;
  role?: AdminRole;
};

export function AdminPageFrame({
  section,
  eyebrow,
  title,
  description,
  onLogout,
  onNavigate,
  children,
  actions,
  role,
}: Props) {
  return (
    <div className="admin-shell">
      <AdminHeader
        refreshing={false}
        lastUpdatedAt={null}
        onLogout={onLogout}
        onOpenCustomer={() => window.location.assign("/")}
        activeSection={section}
        onNavigate={onNavigate}
        role={role}
      />
      <main className="admin-main admin-section-main">
        <header className="admin-section-heading">
          <span>
            <small>{eyebrow}</small>
            <h1>{title}</h1>
            <p>{description}</p>
          </span>
          {actions && <div>{actions}</div>}
        </header>
        {children}
      </main>
    </div>
  );
}
