"use client";

import type { HierarchyPerson } from "@/types";
import { OFFICE_LABEL, OFFICE_RING } from "@/lib/house-content";
import { initialsFromName } from "@/lib/avatar";
import { cn } from "@/lib/utils";

type Props = {
  person: HierarchyPerson;
  childrenPeople: HierarchyPerson[];
  all: HierarchyPerson[];
};

export function OrganogramNode({ person, childrenPeople, all }: Props) {
  const ring = OFFICE_RING[person.office];
  const label = person.office_label || OFFICE_LABEL[person.office];

  return (
    <div className="flex flex-col items-center">
      <div className="flex flex-col items-center rounded-3xl bg-white/90 px-4 py-3 shadow-soft">
        <div
          className="h-20 w-20 overflow-hidden rounded-full"
          style={{ boxShadow: `0 0 0 4px ${ring}` }}
          title={label}
        >
          {person.photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={person.photo_url}
              alt={person.full_name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div
              className="flex h-full w-full items-center justify-center font-display text-xl font-semibold text-white"
              style={{ backgroundColor: ring }}
            >
              {initialsFromName(person.full_name)}
            </div>
          )}
        </div>
        <p className="mt-2 max-w-[140px] text-center font-display text-base text-navy">
          {person.full_name}
        </p>
        <p className="max-w-[140px] text-center text-[11px] font-semibold" style={{ color: ring }}>
          {label}
        </p>
        {person.bio ? (
          <p className="mt-1 max-w-[160px] text-center text-[11px] text-navy/55">{person.bio}</p>
        ) : null}
      </div>

      {childrenPeople.length > 0 ? (
        <>
          <div className="h-6 w-px bg-navy/20" />
          <div
            className={cn(
              "flex flex-wrap justify-center gap-6 border-t border-navy/15 pt-6",
              childrenPeople.length > 1 && "px-2",
            )}
          >
            {childrenPeople.map((child) => (
              <OrganogramNode
                key={child.id}
                person={child}
                childrenPeople={all
                  .filter((p) => p.parent_id === child.id)
                  .sort((a, b) => a.sort_order - b.sort_order)}
                all={all}
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
