import { useState, useRef, useMemo, useEffect } from 'react';
import {
  DndContext,
  DragOverlay,
  pointerWithin,
  type DropAnimation,
  defaultDropAnimationSideEffects
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { createPortal } from 'react-dom';
import { Pin, FolderOpen } from 'lucide-react';
import { toast } from 'sonner';

import { GroupCard } from './GroupCard';
import { TabCard } from './TabCard';
import type { Group, TabItem } from '@/types';
import { filterGroups } from '@/lib/logic';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

import { useGroups } from '@/hooks/useGroups';
import { useDashboardDnD } from '@/hooks/useDashboardDnD';
import { useKeyboardNav } from '@/hooks/useKeyboardNav';
import { DashboardHeader } from './DashboardHeader';

export function Dashboard() {
  const [searchQuery, setSearchQuery] = useState('');
  const [autoFocusGroupId, setAutoFocusGroupId] = useState<string | null>(null);
  const [groupToDelete, setGroupToDelete] = useState<Group | null>(null);
  const [renamingGroupId, setRenamingGroupId] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const {
      groups,
      selectedId,
      setSelectedId,
      updateGroups,
      updateGroupData,
      removeGroup,
      removeTab,
      restoreGroup,
      restoreTab,
      getFlattenedItems,
  } = useGroups();

  const { isShiftPressed, shiftPressedRef } = useKeyboardNav({
      groups,
      selectedId,
      setSelectedId,
      updateGroups,
      updateGroupData,
      restoreGroup,
      restoreTab,
      removeGroup,
      removeTab,
      setRenamingGroupId,
      searchInputRef,
      getFlattenedItems
  });

  const {
      sensors,
      activeId,
      activeItem,
      handleDragStart,
      handleDragOver,
      handleDragEnd
  } = useDashboardDnD(groups, updateGroups, shiftPressedRef);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const newGroupId = params.get('newGroupId');
    if (newGroupId) {
       // Clear query param to prevent re-focus on refresh
       window.history.replaceState({}, '', 'index.html');
       setAutoFocusGroupId(newGroupId);
    }
  }, []);

  const pinnedGroups = useMemo(() =>
    filterGroups(groups.filter(g => g.pinned), searchQuery),
  [groups, searchQuery]);

  const unpinnedGroups = useMemo(() =>
    filterGroups(groups.filter(g => !g.pinned), searchQuery),
  [groups, searchQuery]);

  // Import handler passed to Header
  const handleImport = (importedGroups: Group[]) => {
      // Ensure sorted order
      updateGroups(importedGroups.sort((a, b) => a.order - b.order));
  };

  const handleConfirmDelete = async () => {
    if (!groupToDelete) return;
    await removeGroup(groupToDelete.id);
    setGroupToDelete(null);
    toast.success('Group deleted.');
  };

  const dropAnimation: DropAnimation = {
      sideEffects: defaultDropAnimationSideEffects({
        styles: {
          active: {
            opacity: '0.5',
          },
        },
      }),
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-8">
      <DashboardHeader
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onGroupsImported={handleImport}
        searchInputRef={searchInputRef}
      />

      <AlertDialog open={!!groupToDelete} onOpenChange={(open) => !open && setGroupToDelete(null)}>
        <AlertDialogContent onKeyDown={(e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleConfirmDelete();
            }
        }}>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete group?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{groupToDelete?.title}" and its {groupToDelete?.items.length} tab(s).
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
                onClick={handleConfirmDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                autoFocus // Focus delete button by default
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Empty State */}
      {groups.length === 0 && !searchQuery && (
        <div className="flex flex-col items-center justify-center py-16 text-center animate-in fade-in zoom-in-50 duration-300 slide-in-from-bottom-5">
           <div className="bg-muted/30 p-4 rounded-full mb-4">
             <FolderOpen className="h-10 w-10 text-muted-foreground/40" />
           </div>
           <h3 className="text-lg font-semibold text-foreground">No saved tabs yet</h3>
           <p className="text-sm text-muted-foreground mt-2 max-w-[300px] leading-relaxed">
             Click the extension icon in your browser toolbar to stash your open tabs into a new group.
           </p>
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={pointerWithin}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="space-y-8">
            {/* Pinned Section */}
            {pinnedGroups.length > 0 && (
                <section className="max-w-3xl mx-auto w-full">
                    <h2 className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wider flex items-center gap-2">
                        <Pin className="h-4 w-4" />Pinned
                    </h2>
                    <SortableContext
                        items={pinnedGroups.map(g => g.id)}
                        strategy={isShiftPressed ? undefined : verticalListSortingStrategy}
                    >
                        <div className="flex flex-col gap-4">
                            {pinnedGroups.map(group => (
                                <GroupCard
                                    key={group.id}
                                    group={group}
                                    onRemoveGroup={(id) => setGroupToDelete(groups.find(g => g.id === id) || null)}
                                    onRemoveTab={removeTab}
                                    onUpdateGroup={updateGroupData}
                                    onRestore={restoreGroup}
                                    onRestoreTab={restoreTab}
                                    autoFocusName={group.id === autoFocusGroupId}
                                    isSelected={selectedId === group.id}
                                    selectedTabId={selectedId}
                                    isRenaming={renamingGroupId === group.id}
                                    onRenameStop={() => {
                                        setRenamingGroupId(null);
                                        if (autoFocusGroupId === group.id) {
                                            setAutoFocusGroupId(null);
                                        }
                                    }}
                                    isMerging={isShiftPressed}
                                />
                            ))}
                        </div>
                    </SortableContext>
                </section>
            )}

            {/* Main Grid */}
             <section className="max-w-3xl mx-auto w-full">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                        <FolderOpen className="h-4 w-4" />Collections
                    </h2>
                </div>
                 <SortableContext
                    items={unpinnedGroups.map(g => g.id)}
                    strategy={isShiftPressed ? undefined : verticalListSortingStrategy}
                 >
                    <div className="flex flex-col gap-4">
                         {unpinnedGroups.map(group => (
                            <GroupCard
                                key={group.id}
                                group={group}
                                onRemoveGroup={(id) => setGroupToDelete(groups.find(g => g.id === id) || null)}
                                onRemoveTab={removeTab}
                                onUpdateGroup={updateGroupData}
                                onRestore={restoreGroup}
                                onRestoreTab={restoreTab}
                                autoFocusName={group.id === autoFocusGroupId}
                                isSelected={selectedId === group.id}
                                selectedTabId={selectedId}
                                isRenaming={renamingGroupId === group.id}
                                onRenameStop={() => {
                                    setRenamingGroupId(null);
                                    if (autoFocusGroupId === group.id) {
                                        setAutoFocusGroupId(null);
                                    }
                                }}
                                isMerging={isShiftPressed}
                            />
                        ))}
                    </div>
                </SortableContext>
             </section>

             {createPortal(
                <DragOverlay dropAnimation={dropAnimation}>
                  {activeId && activeItem ? (
                     // Narrow type using 'in' operator to check for Group-specific property
                     ('items' in activeItem) ? (
                           <GroupCard
                               group={activeItem as Group}
                               onRemoveGroup={() => {}}
                               onRemoveTab={() => {}}
                               onUpdateGroup={() => {}}
                               onRestore={() => {}}
                               onRestoreTab={() => {}}
                               // Removed invalid 'isOverlay' string
                               autoFocusName={false}
                               isSelected={false}
                               selectedTabId={null}
                               isRenaming={false}
                               onRenameStop={() => {}}
                               isMerging={false}
                           />
                     ) : (
                           <TabCard
                               tab={activeItem as TabItem}
                               onRemove={() => {}}
                               onRestore={() => {}}
                               isSelected={false}
                           />
                     )
                  ) : null}
                </DragOverlay>,
                document.body
              )}
        </div>
      </DndContext>
    </div>
  );
}
