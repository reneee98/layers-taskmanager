"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { FileText } from "lucide-react";
import type { Project, Task } from "@/types/database";

interface ProjectReportGeneratorProps {
  project: Project;
  tasks: Task[];
}

interface ReportOptions {
  showOnlyDone: boolean;
  showSummary: boolean;
  showTasksTable: boolean;
  showTimeEntries: boolean;
}

export const ProjectReportGenerator = ({ project, tasks }: ProjectReportGeneratorProps) => {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<ReportOptions>({
    showOnlyDone: true,
    showSummary: true,
    showTasksTable: true,
    showTimeEntries: true,
  });

  const handleOpenReport = () => {
    const params = new URLSearchParams();
    params.set("onlyDone", options.showOnlyDone ? "true" : "false");
    params.set("showSummary", options.showSummary ? "true" : "false");
    params.set("showTasksTable", options.showTasksTable ? "true" : "false");
    params.set("showTimeEntries", options.showTimeEntries ? "true" : "false");
    
    router.push(`/projects/${project.id}/report?${params.toString()}`);
    setIsOpen(false);
  };

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        variant="outline"
        className="gap-2"
      >
        <FileText className="h-4 w-4" />
        Zobraziť report
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Nastavenia reportu</DialogTitle>
            <DialogDescription>
              Vyberte, čo chcete zobraziť v reporte
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="onlyDone"
                checked={options.showOnlyDone}
                onCheckedChange={(checked) =>
                  setOptions({ ...options, showOnlyDone: checked === true })
                }
              />
              <Label
                htmlFor="onlyDone"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                Zobraziť iba dokončené úlohy
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="showSummary"
                checked={options.showSummary}
                onCheckedChange={(checked) =>
                  setOptions({ ...options, showSummary: checked === true })
                }
              />
              <Label
                htmlFor="showSummary"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                Zobraziť summary karty
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="showTasksTable"
                checked={options.showTasksTable}
                onCheckedChange={(checked) =>
                  setOptions({ ...options, showTasksTable: checked === true })
                }
              />
              <Label
                htmlFor="showTasksTable"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                Zobraziť tabuľku úloh
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="showTimeEntries"
                checked={options.showTimeEntries}
                onCheckedChange={(checked) =>
                  setOptions({ ...options, showTimeEntries: checked === true })
                }
              />
              <Label
                htmlFor="showTimeEntries"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                Zobraziť detailné časové záznamy
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Zrušiť
            </Button>
            <Button onClick={handleOpenReport}>
              Zobraziť report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
