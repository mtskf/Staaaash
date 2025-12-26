import React, { forwardRef } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { TabItem } from '@/types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, ArrowUpRight, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TabCardProps {
  tab: TabItem;
  onRemove: (id: string) => void;
  onRestore: (id: string) => void;
  style?: React.CSSProperties;
  isDragging?: boolean;
  isSelected?: boolean;
}

export const TabCard = forwardRef<HTMLDivElement, TabCardProps & React.HTMLAttributes<HTMLDivElement>>(
  ({ tab, onRemove, onRestore, style, isDragging, isSelected, className, ...props }, ref) => {
    return (
      <div ref={ref} style={style} className={cn("touch-none", className)} {...props} id={`item-${tab.id}`}>
        <Card className={cn(
            "flex items-center justify-between p-2 hover:bg-accent/50 group cursor-grab active:cursor-grabbing border-0 bg-muted/30 shadow-none",
            isDragging && "opacity-50",
            isSelected && "ring-1 ring-primary border-primary bg-accent"
          )}>
          <div className="flex items-center gap-2 overflow-hidden">
             <div tabIndex={-1} className="text-muted-foreground/50 cursor-grab active:cursor-grabbing">
                <GripVertical className="h-4 w-4" />
             </div>
            {tab.favIconUrl && (
              <img src={tab.favIconUrl} alt="" className="w-4 h-4 shrink-0" />
            )}
            <span className="truncate text-sm font-medium">{tab.title}</span>
          </div>
          <div className={cn(
            "flex items-center gap-1 transition-opacity",
            isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          )}>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
                onRestore(tab.id);
              }}
              onPointerDown={(e: React.PointerEvent) => e.stopPropagation()}
              title="Restore tab"
            >
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-red-500 hover:text-red-600"
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation(); // Prevent drag start
                onRemove(tab.id);
              }}
              onPointerDown={(e: React.PointerEvent) => e.stopPropagation()} // Prevent drag start
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </Card>
      </div>
    );
  }
);

TabCard.displayName = "TabCard";

export function SortableTabCard({ tab, onRemove, onRestore, isSelected }: { tab: TabItem, onRemove: (id: string) => void, onRestore: (id: string) => void, isSelected?: boolean }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: tab.id, data: { type: 'Tab', tab } });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  return (
    <TabCard
      ref={setNodeRef}
      style={style}
      tab={tab}
      onRemove={onRemove}
      onRestore={onRestore}
      isDragging={isDragging}
      isSelected={isSelected}
      {...attributes}
      {...listeners}
    />
  );
}
