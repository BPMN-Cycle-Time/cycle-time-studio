import { useTranslations } from "next-intl";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface DeleteProjectDialogProps {
  project: { id: string; name: string } | null;
  onOpenChange: (open: boolean) => void;
  onDeleteProject: (id: string) => void;
}

export function DeleteProjectDialog({
  project,
  onOpenChange,
  onDeleteProject,
}: DeleteProjectDialogProps) {
  const t = useTranslations("Sidebar");

  return (
    <AlertDialog open={project !== null} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("deleteProject", { name: project?.name ?? "" })}</AlertDialogTitle>
          <AlertDialogDescription>{t("deleteWarning")}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-white hover:bg-destructive/90"
            onClick={() => project && onDeleteProject(project.id)}
          >
            {t("delete")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
