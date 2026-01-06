import React, { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { Group, TabItem } from '@/types';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SortableTabCard } from './TabCard';
import { GripVertical, Trash2, ChevronDown, ChevronRight, Pin, ArrowUpRight, Pencil } from 'lucide-react';
import { cn, formatRelativeTime } from '@/lib/utils';
import { t } from '@/lib/i18n';

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
  isMerging?: boolean;
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
  onRenameStop,
  isMerging
}: GroupCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [newTitle, setNewTitle] = useState(group.title);

  React.useEffect(() => {
    if (autoFocusName) {
      setIsEditing(true);
      // Small delay to ensure input is rendered before focus
      const timeoutId = setTimeout(() => {
          const input = document.getElementById(`group-title-${group.id}`) as HTMLInputElement;
          if (input) {
              input.focus();
              input.select();
          }
      }, 50);
      return () => clearTimeout(timeoutId);
    }
  }, [autoFocusName, group.id]);

  // Sync external renaming state
  React.useEffect(() => {
    if (isRenaming) {
        setIsEditing(true);
        const timeoutId = setTimeout(() => {
            const input = document.getElementById(`group-title-${group.id}`) as HTMLInputElement;
            if (input) {
                input.focus();
                input.select();
            }
        }, 50);
        return () => clearTimeout(timeoutId);
    }
  }, [isRenaming, group.id]);

  // Sync newTitle when group.title changes externally (e.g., via Firebase sync)
  React.useEffect(() => {
    if (!isEditing) {
      setNewTitle(group.title);
    }
  }, [group.title, isEditing]);

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
    // If merging is active and this item is NOT the one being dragged,
    // suppress the transform so it doesn't move out of the way.
    transform: isMerging && !isDragging ? undefined : CSS.Translate.toString(transform),
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
          <div className="flex items-center gap-2 flex-1 min-w-0 mr-4">
             {/* Drag Handle */}
            <div {...attributes} {...listeners} tabIndex={-1} className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground">
               <GripVertical className="h-4 w-4" />
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0"
              onClick={() => onUpdateGroup(group.id, { collapsed: !group.collapsed })}
              aria-label={group.collapsed ? t('group_expand') : t('group_collapse')}
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
                    if (e.key === 'Enter') handleTitleSubmit();
                    if (e.key === 'Escape') {
                      setNewTitle(group.title); // Revert to original
                      setIsEditing(false);
                      onRenameStop?.();
                    }
                  }}
                  className="h-7 w-full"
                />
              ) : (
                  <div className="flex items-center gap-1">
                    <h3
                      className="text-sm font-medium truncate cursor-text hover:underline"
                      onClick={() => setIsEditing(true)}
                      title={t('click_to_rename')}
                    >
                      {group.title}
                    </h3>
                    <Pencil
                      className="h-3 w-3 text-muted-foreground shrink-0 cursor-pointer hover:text-foreground"
                      onClick={() => setIsEditing(true)}
                    />
                  </div>
              )}
              <div className="text-[10px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                <span>{group.createdAt ? formatRelativeTime(group.createdAt) : t('unknown_date')}</span>
                <span>•</span>
                <span>{t('tabs_count', [String(group.items.length)])}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
              {/* Restore Button */}
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                onClick={() => onRestore(group.id)}
                aria-label={t('group_restore_all')}
              >
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Button>

              {/* Pin Button */}
              <Button
                variant="ghost"
                size="icon"
                className={cn("h-7 w-7", group.pinned ? "text-yellow-500" : "text-muted-foreground")}
                onClick={() => onUpdateGroup(group.id, { pinned: !group.pinned })}
                aria-label={group.pinned ? t('group_unpin') : t('group_pin')}
              >
                {group.pinned ? <Pin className="h-3.5 w-3.5 fill-current" /> : <Pin className="h-3.5 w-3.5" />}
              </Button>

              {/* Delete Button */}
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-red-500 hover:text-red-600"
                onClick={() => onRemoveGroup(group.id)}
                aria-label={t('group_delete')}
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
                   {t('drop_tabs_here')}
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
