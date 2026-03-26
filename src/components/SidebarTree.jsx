import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ChevronRight } from "lucide-react";

function TreeNode({ group, allGroups, allSites, depth, expanded, onToggle, location }) {
  const navigate = useNavigate();
  const children = allGroups.filter((g) => g.parent_id === group.id);
  const hasKids = children.length > 0;
  const isActive = location.pathname === "/sites" && location.search.includes(`group_id=${group.id}`);
  const isExpanded = expanded[group.id];

  // Count sites under this group and its descendants
  function countSites(gid) {
    let count = allSites.filter((s) => s.group_id === gid).length;
    allGroups.filter((g) => g.parent_id === gid).forEach((c) => { count += countSites(c.id); });
    return count;
  }
  const siteCount = countSites(group.id);
  const pl = 32 + depth * 20;

  return (
    <>
      <div
        onClick={() => navigate(`/sites?group_id=${group.id}`)}
        className={`flex items-center gap-[5px] py-[6px] px-2 cursor-pointer rounded-md mx-[6px] my-[1px] text-[12px] transition-all duration-100 ${
          isActive
            ? "bg-accent-light text-accent-text font-semibold"
            : "text-text-secondary hover:bg-canvas"
        }`}
        style={{ paddingLeft: pl }}
      >
        {hasKids ? (
          <span
            onClick={(e) => { e.stopPropagation(); onToggle(group.id); }}
            className={`inline-flex transition-transform duration-150 opacity-50 shrink-0 ${isExpanded ? "rotate-90" : ""}`}
          >
            <ChevronRight size={12} strokeWidth={2.5} />
          </span>
        ) : (
          <span className="w-3 inline-block shrink-0" />
        )}
        <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">{group.name}</span>
        <span className="text-[10px] text-text-muted font-normal ml-auto shrink-0">{siteCount}</span>
      </div>
      {isExpanded && children.map((child) => (
        <TreeNode
          key={child.id}
          group={child}
          allGroups={allGroups}
          allSites={allSites}
          depth={depth + 1}
          expanded={expanded}
          onToggle={onToggle}
          location={location}
        />
      ))}
    </>
  );
}

export default function SidebarTree({ groups, sites }) {
  const location = useLocation();
  const [expanded, setExpanded] = useState({});

  function onToggle(id) {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  const rootGroups = groups.filter((g) => !g.parent_id);
  if (rootGroups.length === 0) return null;

  return (
    <div>
      {rootGroups.map((g) => (
        <TreeNode
          key={g.id}
          group={g}
          allGroups={groups}
          allSites={sites}
          depth={0}
          expanded={expanded}
          onToggle={onToggle}
          location={location}
        />
      ))}
    </div>
  );
}
