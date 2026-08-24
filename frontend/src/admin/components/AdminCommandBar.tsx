import { CalendarBlankIcon } from "@phosphor-icons/react/dist/csr/CalendarBlank";
import { CaretLeftIcon } from "@phosphor-icons/react/dist/csr/CaretLeft";
import { CaretRightIcon } from "@phosphor-icons/react/dist/csr/CaretRight";
import { CaretDownIcon } from "@phosphor-icons/react/dist/csr/CaretDown";
import { FunnelSimpleIcon } from "@phosphor-icons/react/dist/csr/FunnelSimple";
import { MagnifyingGlassIcon } from "@phosphor-icons/react/dist/csr/MagnifyingGlass";
import { PlusIcon } from "@phosphor-icons/react/dist/csr/Plus";
import { useState } from "react";
import type { AdminFilters, AdminProfessional } from "../admin.types";
import { formatDateLong, shiftDate, todayInIstanbul } from "../lib/adminFormat";
import { Button } from "../../components/ui/button";

type Props = {
  date: string;
  professionals: AdminProfessional[];
  filters: AdminFilters;
  onDateChange: (date: string) => void;
  onFiltersChange: (filters: AdminFilters) => void;
  onCreateBooking: () => void;
  canCreateBooking?: boolean;
  view: "day" | "week" | "agenda";
  onViewChange: (view: "day" | "week" | "agenda") => void;
};

export function AdminCommandBar({
  date,
  professionals,
  filters,
  onDateChange,
  onFiltersChange,
  onCreateBooking,
  canCreateBooking = true,
  view,
  onViewChange,
}: Props) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const update = (field: keyof AdminFilters, value: string) =>
    onFiltersChange({ ...filters, [field]: value });
  const activeFilterCount = [
    filters.professionalId,
    filters.status,
    filters.source,
    filters.query.trim(),
  ].filter(Boolean).length;
  const today = todayInIstanbul();

  return (
    <section className="admin-command-bar" aria-label="Pano kontrolleri">
      <div className="admin-command-bar__primary">
        <div
          className="admin-view-switch"
          role="tablist"
          aria-label="Randevu görünümü"
        >
          <button
            type="button"
            role="tab"
            aria-selected={view === "day"}
            className={view === "day" ? "is-active" : ""}
            onClick={() => onViewChange("day")}
          >
            Gün
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={view === "week"}
            className={view === "week" ? "is-active" : ""}
            onClick={() => onViewChange("week")}
          >
            Hafta
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={view === "agenda"}
            className={view === "agenda" ? "is-active" : ""}
            onClick={() => onViewChange("agenda")}
          >
            Liste
          </button>
        </div>

        <div className="admin-date-control">
          <button
            type="button"
            onClick={() =>
              onDateChange(shiftDate(date, view === "week" ? -7 : -1))
            }
            aria-label="Önceki gün"
          >
            <CaretLeftIcon size={20} weight="bold" />
          </button>
          <label className="admin-date-control__value">
            <CalendarBlankIcon size={20} weight="duotone" />
            <span>
              <small>Seçili gün</small>
              <strong>{formatDateLong(date)}</strong>
            </span>
            <input
              id="admin-selected-date"
              name="adminSelectedDate"
              type="date"
              value={date}
              onChange={(event) => onDateChange(event.target.value)}
              aria-label="Tarih seç"
            />
          </label>
          <button
            type="button"
            onClick={() =>
              onDateChange(shiftDate(date, view === "week" ? 7 : 1))
            }
            aria-label="Sonraki gün"
          >
            <CaretRightIcon size={20} weight="bold" />
          </button>
          {date !== today && (
            <button
              className="admin-today-button"
              type="button"
              onClick={() => onDateChange(today)}
            >
              Bugün
            </button>
          )}
        </div>

        {canCreateBooking && (
          <Button
            className="admin-primary-button admin-create-booking-button"
            type="button"
            onClick={onCreateBooking}
          >
            <PlusIcon size={20} weight="bold" />
            <span>Yeni randevu</span>
          </Button>
        )}
      </div>

      <button
        className="admin-filter-toggle"
        type="button"
        aria-expanded={filtersOpen}
        aria-controls="admin-filter-panel"
        onClick={() => setFiltersOpen((open) => !open)}
      >
        <FunnelSimpleIcon size={19} weight="bold" />
        <span>Filtreler</span>
        {activeFilterCount > 0 && (
          <b aria-label={`${activeFilterCount} etkin filtre`}>
            {activeFilterCount}
          </b>
        )}
        <CaretDownIcon
          className={filtersOpen ? "is-open" : ""}
          size={17}
          weight="bold"
        />
      </button>

      <div
        className={`admin-command-bar__secondary${filtersOpen ? " is-open" : ""}`}
        id="admin-filter-panel"
      >
        <div className="admin-filters">
          <label>
            <span>Uzman</span>
            <select
              id="admin-professional-filter"
              name="adminProfessionalFilter"
              value={filters.professionalId}
              onChange={(event) => update("professionalId", event.target.value)}
            >
              <option value="">Tüm uzmanlar</option>
              {professionals.map((professional) => (
                <option value={professional.id} key={professional.id}>
                  {professional.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Durum</span>
            <select
              id="admin-status-filter"
              name="adminStatusFilter"
              value={filters.status}
              onChange={(event) => update("status", event.target.value)}
            >
              <option value="">Tüm durumlar</option>
              <option value="PENDING_APPROVAL">Onay bekliyor</option>
              <option value="CONFIRMED">Onaylandı</option>
              <option value="HOLD">Saat tutuluyor</option>
              <option value="REJECTED">Reddedildi</option>
              <option value="CANCELLED">İptal edildi</option>
            </select>
          </label>
          <label>
            <span>Kaynak</span>
            <select
              id="admin-source-filter"
              name="adminSourceFilter"
              value={filters.source}
              onChange={(event) => update("source", event.target.value)}
            >
              <option value="">Tüm kaynaklar</option>
              <option value="ONLINE">Online</option>
              <option value="PHONE">Telefon</option>
              <option value="ADMIN">Yönetici</option>
              <option value="WALK_IN">Salondan</option>
            </select>
          </label>
          <label className="admin-search-field">
            <span>Ara</span>
            <MagnifyingGlassIcon size={19} />
            <input
              id="admin-booking-search"
              name="adminBookingSearch"
              type="search"
              value={filters.query}
              onChange={(event) => update("query", event.target.value)}
              placeholder="İsim, telefon, kod…"
            />
          </label>
        </div>
      </div>
    </section>
  );
}
