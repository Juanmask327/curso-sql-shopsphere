import { cn } from "@/lib/utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Render as a specific shape */
  shape?: "rect" | "circle" | "text";
}

function Skeleton({ className, shape = "rect", ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        "skeleton",
        shape === "circle" && "rounded-full",
        shape === "text" && "h-4 rounded",
        shape === "rect" && "rounded-md",
        className
      )}
      aria-hidden="true"
      {...props}
    />
  );
}

/** Skeleton for a table row */
function SkeletonTableRow({ columns = 3 }: { columns?: number }) {
  return (
    <tr className="border-b border-neutral-100">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton
            className="h-4"
            style={{ width: `${60 + Math.random() * 30}%` }}
          />
        </td>
      ))}
    </tr>
  );
}

/** Skeleton for the entire results table */
function SkeletonTable({ rows = 5, columns = 3 }: { rows?: number; columns?: number }) {
  return (
    <div className="overflow-hidden rounded-lg border border-neutral-200">
      {/* Header */}
      <div className="flex gap-4 px-4 py-3 bg-neutral-50 border-b border-neutral-200">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-20" />
        ))}
      </div>
      {/* Rows */}
      <table className="w-full">
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <SkeletonTableRow key={i} columns={columns} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

export { Skeleton, SkeletonTableRow, SkeletonTable };
