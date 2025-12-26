import React, { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { Group, TabItem } from '@/types';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SortableTabCard } from './TabCard';
import { GripVertical, Trash2, ChevronDown, ChevronRight, Pin, ArrowUpRight } from 'lucide-react';
import { cn, formatRelativeTime } from '@/lib/utils'; // Keep this for now

interface GroupCardProps {
  group: Group;
  onRemoveGroup: (id: string) => void;
  onRemoveTab: (groupId: string, tabId: string) => void;
  onUpdateGroup: (id: string, data: Partial<Group>) => void;
  onRestore: (id: string) => void;
  onRestoreTab: (groupId: string, tabId: string) => void;
  autoFocusName?: boolean;
  isSelected?: boolean;
  selectedTabId?: string | null;
  isRenaming?: boolean;
  onRenameStop?: () => void;
}

export function GroupCard({
  group,
  onRemoveGroup,
  onRemoveTab,
  onUpdateGroup,
  onRestore,
  onRestoreTab,
  autoFocusName,
  isSelected,
  selectedTabId,
  isRenaming,
  onRenameStop
}: GroupCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [newTitle, setNewTitle] = useState(group.title);

  React.useEffect(() => {
    if (autoFocusName) {
      setIsEditing(true);
      // Small delay to ensure input is rendered before focus
      setTimeout(() => {
          const input = document.getElementById(`group-title-${group.id}`) as HTMLInputElement;
          if (input) {
              input.focus();
              input.select();
          }
      }, 50);
    }
  }, [autoFocusName, group.id]);

  // Sync external renaming state
  React.useEffect(() => {
    if (isRenaming) {
        setIsEditing(true);
        setTimeout(() => {
            const input = document.getElementById(`group-title-${group.id}`) as HTMLInputElement;
            if (input) {
                input.focus();
                input.select();
            }
        }, 50);
    }
  }, [isRenaming, group.id]);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({
    id: group.id,
    data: { type: 'Group', group },
    disabled: isEditing // Disable drag while editing name
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleTitleSubmit = () => {
    if (newTitle.trim()) {
      onUpdateGroup(group.id, { title: newTitle });
    } else {
      setNewTitle(group.title);
    }
    setIsEditing(false);
    onRenameStop?.();
  };

  return (
    <div ref={setNodeRef} style={style} className="flex flex-col" id={`item-${group.id}`}>
      <Card className={cn(
        "flex flex-col transition-all",
        group.collapsed ? "h-auto" : "h-auto",
        isSelected && "ring-2 ring-primary border-primary"
      )}>
        <CardHeader className="p-3 flex flex-row items-center justify-between space-y-0 cursor-default">
          <div className="flex items-center gap-2 flex-1 min-w-0">
             {/* Drag Handle */}
            <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground">
               <GripVertical className="h-4 w-4" />
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0"
              onClick={() => onUpdateGroup(group.id, { collapsed: !group.collapsed })}
            >
              {group.collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>

            <div className="flex flex-col min-w-0 flex-1">
              {isEditing ? (
                <Input
                  id={`group-title-${group.id}`}
                  autoFocus
                  value={newTitle}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewTitle(e.target.value)}
                  onBlur={handleTitleSubmit}
                  onKeyDown={(e: React.KeyboardEvent) => {
                    if (e.key === 'Enter') {
                        handleTitleSubmit();
                    } else if (e.key === 'Escape') {
                        setNewTitle(group.title);
                        setIsEditing(false);
                        onRenameStop?.();
                    }
                  }}
                  className="h-7 text-sm w-full"
                />
              ) : (
                <h3
                  className="text-sm font-medium truncate cursor-text hover:underline"
                  onClick={() => setIsEditing(true)}
                  title="Click to rename"
                >
                  {group.title}
                </h3>
              )}
              <div className="text-[10px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                <span>{group.createdAt ? formatRelativeTime(group.createdAt) : 'Unknown date'}</span>
                <span>•</span>
                <span>{group.items.length} tabs</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
             <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                onClick={() => onRestore(group.id)}
                title="Restore all tabs"
             >
               <ArrowUpRight className="h-3.5 w-3.5" />
             </Button>
             <Button
                variant="ghost"
                size="icon"
                className={cn("h-7 w-7", group.pinned ? "text-primary" : "text-muted-foreground")}
                onClick={() => onUpdateGroup(group.id, { pinned: !group.pinned })}
                title={group.pinned ? "Unpin group" : "Pin group"}
             >
                {group.pinned ? <Pin className="h-3.5 w-3.5 fill-current" /> : <Pin className="h-3.5 w-3.5" />}
             </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive/70 hover:text-destructive"
              onClick={() => onRemoveGroup(group.id)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </CardHeader>

        {!group.collapsed && (
          <CardContent className="p-3 pt-2 flex-1 overflow-y-auto flex flex-col gap-2">
            <SortableContext items={group.items.map((t: TabItem) => t.id)} strategy={verticalListSortingStrategy}>
              {group.items.length === 0 ? (
                 <div className="text-center text-muted-foreground text-xs py-4 border-2 border-dashed rounded-md">
                   Drop tabs here
                 </div>
              ) : (
                 group.items.map((tab: TabItem) => (
                     <SortableTabCard
                       key={tab.id}
                       tab={tab}
                       onRemove={(tabId) => onRemoveTab(group.id, tabId)}
                       onRestore={(tabId) => onRestoreTab(group.id, tabId)}
                       isSelected={selectedTabId === tab.id}
                     />
                 ))
              )}
            </SortableContext>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
