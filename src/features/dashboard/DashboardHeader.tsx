import { useRef } from 'react';
import { Search, Download, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Kbd } from '@/components/ui/kbd';
import { AuthButton } from '@/components/AuthButton';
import { storage } from '@/lib/storage';
import type { Group } from '@/types';

interface DashboardHeaderProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onGroupsImported: (groups: Group[]) => void;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
}

export function DashboardHeader({
  searchQuery,
  setSearchQuery,
  onGroupsImported,
  searchInputRef
}: DashboardHeaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Export handler
  const handleExport = async () => {
    try {
      const json = await storage.exportData();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `staaaash-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Backup exported successfully!');
    } catch {
      toast.error('Failed to export data.');
    }
  };

  // Import handler
  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const importedGroups = await storage.importData(text);
      // Sort is handled in Dashboard/useGroups generally, but we can pass raw data
      onGroupsImported(importedGroups);
      toast.success(`Imported ${importedGroups.length} groups successfully!`);
    } catch {
      toast.error('Failed to import data. Invalid file format.');
    }
    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <header className="mb-8 max-w-3xl mx-auto w-full">
      <div className="flex items-center justify-between mb-8">
        <img src="/logo.png" alt="Staaaash" className="h-8" />
        <AuthButton />
      </div>
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            ref={searchInputRef}
            placeholder="Search groups and tabs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                searchInputRef.current?.blur();
                setSearchQuery('');
              }
            }}
            className="pl-9 pr-16 h-9"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 pointer-events-none">
            <Kbd>⌘</Kbd><Kbd>F</Kbd>
          </div>
        </div>
        <div className="flex">
          <Button variant="outline" size="sm" onClick={handleExport} className="rounded-r-none border-r-0">
            <Download className="h-4 w-4 mr-1" />
            Export
          </Button>
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="rounded-l-none">
            <Upload className="h-4 w-4 mr-1" />
            Import
          </Button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleImport}
          className="hidden"
        />
      </div>
    </header>
  );
}
