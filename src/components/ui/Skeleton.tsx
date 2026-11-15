import React from "react";

/*
 * Squelettes de chargement : une forme grise qui pulse à la place du contenu en cours de
 * chargement. Les formes imitent la mise en page finale (tableau, cartes, liste), donc la
 * page ne « saute » pas quand les données arrivent.
 */

type SkeletonProps = { className?: string };

/** Forme de base. Arrondie par défaut ; passe `rounded-2xl` etc. dans className pour changer. */
export const Skeleton: React.FC<SkeletonProps> = ({ className = "" }) => (
  <div
    aria-hidden="true"
    className={`animate-pulse bg-gray-200/70 ${
      className.includes("rounded") ? "" : "rounded-full"
    } ${className}`}
  />
);

const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = "",
}) => (
  <div
    role="status"
    aria-label="Chargement"
    className={`overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm ${className}`}
  >
    {children}
  </div>
);

/** Tableau : une barre d'en-tête puis `rows` lignes de `cols` colonnes. */
export const TableSkeleton: React.FC<{ rows?: number; cols?: number }> = ({
  rows = 6,
  cols = 4,
}) => (
  <Card>
    <div className="flex gap-6 border-b border-gray-100 bg-gray-50/70 px-6 py-4">
      {Array.from({ length: cols }).map((_, c) => (
        <Skeleton key={c} className="h-3 flex-1" />
      ))}
    </div>
    <div className="divide-y divide-gray-100">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-6 px-6 py-4">
          <div className="flex flex-1 items-center gap-3">
            <Skeleton className="h-9 w-9 shrink-0" />
            <Skeleton className="h-3.5 w-2/3" />
          </div>
          {Array.from({ length: Math.max(cols - 1, 0) }).map((_, c) => (
            <Skeleton key={c} className="h-3.5 flex-1" />
          ))}
        </div>
      ))}
    </div>
  </Card>
);

/** Groupes de cartes avec des tuiles (permissions par module). */
export const GroupsSkeleton: React.FC<{ groups?: number }> = ({ groups = 3 }) => (
  <div role="status" aria-label="Chargement" className="space-y-4">
    {Array.from({ length: groups }).map((_, g) => (
      <Card key={g}>
        <div className="border-b border-gray-100 bg-gray-50/70 px-4 py-3">
          <Skeleton className="h-3.5 w-32" />
        </div>
        <div className="grid grid-cols-1 gap-2 p-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 rounded-2xl" />
          ))}
        </div>
      </Card>
    ))}
  </div>
);

/** Liste de lignes avec pastille ronde (notifications). */
export const ListSkeleton: React.FC<{ rows?: number }> = ({ rows = 5 }) => (
  <Card className="p-2">
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="flex gap-4 px-4 py-4">
        <Skeleton className="h-11 w-11 shrink-0" />
        <div className="flex-1 space-y-2.5">
          <Skeleton className="h-3.5 w-1/3" />
          <Skeleton className="h-3 w-3/4" />
          <Skeleton className="h-3 w-1/4" />
        </div>
      </div>
    ))}
  </Card>
);

/** Page de détails : 4 cartes de statistiques puis un tableau d'informations. */
export const DetailsSkeleton: React.FC = () => (
  <div role="status" aria-label="Chargement">
    <div className="mb-6 space-y-3">
      <Skeleton className="h-9 w-40" />
      <Skeleton className="h-7 w-64" />
      <Skeleton className="h-3.5 w-48" />
    </div>
    <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 rounded-3xl border border-gray-100 bg-white p-4 shadow-sm"
        >
          <Skeleton className="h-10 w-10 shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-1/3" />
            <Skeleton className="h-3.5 w-2/3" />
          </div>
        </div>
      ))}
    </div>
    <Card>
      <div className="divide-y divide-gray-100">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="grid grid-cols-1 gap-3 p-4 md:grid-cols-2">
            <Skeleton className="h-3.5 w-40" />
            <Skeleton className="h-3.5 w-56" />
          </div>
        ))}
      </div>
    </Card>
  </div>
);